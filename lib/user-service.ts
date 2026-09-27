import { db } from "@/lib/db"

export async function getUserByUsername  (username: string) {
    const user = await db.user.findUnique({
        where: {
            username
        },
        select: {
            id: true,
            externalUserId: true,
            username: true,
            bio: true,
            imageUrl: true,
            stream: {
                select: {
                    id: true,
                    isLive: true,
                    isChatDelayed: true,
                    isChatEnabled: true,
                    isChatFollowersOnly: true,
                    thumbnaiUrl: true,
                    name: true
                },
            },
            _count: {
                select: {
                    followedBy: true
                }
            }
        }
    })

    return user
}

export async function getUserById(id:string) {
    const user = await db.user.findUnique({
        where: {id},
        include: {
            stream: true
        }
    })

    return user
}

export const getEligibleGuests = async () => {
    try {
        const users = await db.user.findMany({
            where: {
                role: "INVITADO"
            },
            select: {
                id: true,
                username: true,
                imageUrl: true,
                firstName: true,
                lastName: true,
                studentId: true,
                career: true,
            }
        });
        return users;
    } catch {
        return [];
    }
};