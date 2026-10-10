import { headers } from "next/headers";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { allowRecordingRetry, attachRecordingFile, startEventRecording } from "@/lib/recording";

const receiver = new WebhookReceiver(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
)

export async function POST(req: Request) {
    const body = await req.text()
    const headerPayload = await headers()
    const authorization =  headerPayload.get("Authorization")

    if(!authorization) {
        return new Response("No authorization header", {status: 400})
    }

    const event = receiver.receive(body, authorization)

    const ingressId = event.ingressInfo?.ingressId

    if (ingressId && event.event === "ingress_started") {
        await db.stream.updateMany({
            where: { ingressId },
            data: { isLive: true },
        })
        const events = await db.event.findMany({ where: { ingressId }, select: { id: true } })
        await db.event.updateMany({
            where: { ingressId },
            data: { obsConnected: true },
        })
        for (const item of events) {
            await startEventRecording(item.id)
        }
    }

    if (ingressId && event.event === "ingress_ended") {
        await db.stream.updateMany({
            where: { ingressId },
            data: { isLive: false },
        })
        const events = await db.event.findMany({ where: { ingressId }, select: { id: true } })
        await db.event.updateMany({
            where: { ingressId },
            data: { obsConnected: false },
        })
        for (const item of events) allowRecordingRetry(item.id)
    }

    if (event.event === "egress_ended" && event.egressInfo?.egressId) {
        await attachRecordingFile(event.egressInfo.egressId, event.egressInfo)
    }

    return new Response(null, { status: 200 })
}