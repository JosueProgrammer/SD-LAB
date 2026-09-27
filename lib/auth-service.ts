import { cookies } from "next/headers";
import { db } from "./db";
import { firebaseAdminAuth } from "./firebase-admin";

async function getFirebaseUser() {
    const session = (await cookies()).get("firebase-session")?.value;
    if (!session) throw new Error("Unauthorized");
    return firebaseAdminAuth().verifySessionCookie(session, true);
}

export const getSelf = async () => {
    const self = await getFirebaseUser()

    const user = await db.user.findUnique({
        where: {
            externalUserId: self.uid
        }
    })

    if (!user) {
        throw new Error("Not found")
    }

    return user
}

export  async function getSelfByUsername(username: string) {
    const self = await getFirebaseUser()
    
    const user = await db.user.findUnique({
        where: {username},
        include: {
            stream: true,
            _count: { select: { followedBy: true } }
        }
    })

    if (!user) {
        throw new Error("User not found")
    }

    if(self.uid !== user.externalUserId) {
        throw new Error("Unauthorized")
    }

    return user
}
