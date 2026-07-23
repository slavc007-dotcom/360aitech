import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processDocument } from '@/lib/kb/process-document'
import { isKnowledgeModule } from '@/lib/modules'

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const orgId = formData.get('orgId')
  const moduleKey = formData.get('module')

  if (
    !(file instanceof File) ||
    typeof orgId !== 'string' ||
    typeof moduleKey !== 'string' ||
    !isKnowledgeModule(moduleKey)
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || (membership.role !== 'admin' && membership.role !== 'vodja')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const storagePath = `${orgId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data: doc, error: insertError } = await supabase
    .from('kb_documents')
    .insert({
      org_id: orgId,
      module: moduleKey,
      title: file.name,
      storage_provider: 'supabase',
      storage_path: storagePath,
      mime_type: file.type,
      uploaded_by: user.id
    })
    .select()
    .single()

  if (insertError || !doc) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Insert failed' },
      { status: 400 }
    )
  }

  await processDocument(doc.id)

  return NextResponse.json({ success: true, documentId: doc.id })
}
