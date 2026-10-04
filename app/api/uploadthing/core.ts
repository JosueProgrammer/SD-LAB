import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  thumbnailUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
  .middleware(async () => {
    const self = await getSelf()
    return {user: self}
  })
  .onUploadComplete(async ({metadata, file}) => {
    const fileUrl = file.ufsUrl || file.url;
    await db.stream.update({
        where: {
            userId: metadata.user.id
        },
        data: {
            thumbnaiUrl: fileUrl
        }
    })
    return {fileUrl}
  }),
  eventImageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
  .middleware(async () => {
    const self = await getSelf()
    return {user: self}
  })
  .onUploadComplete(async ({file}) => {
    const fileUrl = file.ufsUrl || file.url;
    return {fileUrl}
  })
} satisfies FileRouter;
export type OurFileRouter = typeof ourFileRouter;

