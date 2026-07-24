import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: doc, error: fetchError } = await supabase
    .from('kb_documents')
    .select('id, org_id, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', doc.org_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || (membership.role !== 'admin' && membership.role !== 'vodja')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase.storage.from('documents').remove([doc.storage_path])

  const { error: deleteError } = await supabase
    .from('kb_documents')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
