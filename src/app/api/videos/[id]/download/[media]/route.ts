import { env } from '@/env'
import { r2 } from '@/lib/cloudflare-r2'
import { prisma } from '@/lib/prisma'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const downloadMediaParamsSchema = z.object({
  id: z.string().uuid(),
  media: z.enum(['video', 'audio']),
})

type DownloadMediaParamsSchema = z.infer<typeof downloadMediaParamsSchema>

export async function GET(
  _: Request,
  { params }: { params: DownloadMediaParamsSchema },
) {
  const { id: videoId, media } = downloadMediaParamsSchema.parse(params)

  try {
    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    })

    const downloadSignedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: env.CLOUDFLARE_BUCKET_NAME,
        Key: media === 'video' ? video.storageKey : video.audioStorageKey,
      }),
      { expiresIn: 60 * 60 /* 1 hour */ },
    )

    return NextResponse.redirect(downloadSignedUrl, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (err) {
    console.log(err)
  }
}
