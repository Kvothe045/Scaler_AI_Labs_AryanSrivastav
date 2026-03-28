// frontend/components/card/CardModal.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import type { Card, List, ChecklistItem } from '../../types';
import { useStore } from '../../store';
import * as api from '../../lib/api';

interface Props {
  card: Card;
  list: List;
  onClose: () => void;
}

export default function CardModal({ card: initialCard, list, onClose }: Props) {
  const store = useStore() as any;
  const { labels, users, boardState } = store;

  const [card,          setCard]          = useState<any>(initialCard);
  const [editTitle,     setEditTitle]     = useState(false);
  const [titleVal,      setTitleVal]      = useState(card.title);
  const [editDesc,      setEditDesc]      = useState(false);
  const [descVal,       setDescVal]       = useState(card.description || '');
  const [newComment,    setNewComment]    = useState('');
  const [newCheckItem,  setNewCheckItem]  = useState('');
  const [addingCheck,   setAddingCheck]   = useState(false);
  const [showLabels,    setShowLabels]    = useState(false);
  const [showMembers,   setShowMembers]   = useState(false);
  const [showDates,     setShowDates]     = useState(false);
  const [showCover,     setShowCover]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [uploadError,   setUploadError]   = useState<string | null>(null);

  // Attachments fetched directly from their own endpoint — not from boardState
  const [attachments, setAttachments] = useState<any[]>(initialCard.attachments || []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch attachments fresh on mount
  useEffect(() => {
    api.getAttachments(card.id)
      .then(data => { if (Array.isArray(data)) setAttachments(data); })
      .catch(err => console.warn('Could not load attachments:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.style.display = 'none';
    input.onchange = handleFileChange;
    document.body.appendChild(input);
    fileInputRef.current = input;
    return () => { document.body.removeChild(input); fileInputRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const refreshBoard = typeof store.refreshBoard === 'function' ? store.refreshBoard : null;

  useEffect(() => {
    const found = boardState?.lists
      ?.flatMap((l: any) => l.cards || [])
      .find((c: any) => c.id === card.id);
    if (found) setCard(found);
  }, [boardState, card.id]);

  const refresh = async () => {
    if (refreshBoard) {
      await refreshBoard();
      const state = useStore.getState() as any;
      const found = state.boardState?.lists
        ?.flatMap((l: any) => l.cards || [])
        .find((c: any) => c.id === card.id);
      if (found) setCard(found);
    }
  };

  const refreshAttachments = async () => {
    try {
      const data = await api.getAttachments(card.id);
      if (Array.isArray(data)) setAttachments(data);
    } catch (err) { console.warn('Could not refresh attachments:', err); }
  };

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    setUploadError(null);
    setLoading(true);
    try {
      await api.uploadAttachment(card.id, file);
      await refreshAttachments();
      await refresh();
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setLoading(false);
      input.value = '';
    }
  };

  const triggerFileUpload = (e: React.MouseEvent) => { e.stopPropagation(); fileInputRef.current?.click(); };

  // ── Card mutations ───────────────────────────────────────────────────────────
  const saveTitle = async () => {
    if (!titleVal.trim()) return;
    setEditTitle(false);
    if (titleVal !== card.title) { await api.updateCard(card.id, { title: titleVal }); await refresh(); }
  };
  const saveDesc = async () => {
    setEditDesc(false);
    if (descVal !== (card.description || '')) { await api.updateCard(card.id, { description: descVal }); await refresh(); }
  };
  const handleComment = async () => {
    if (!newComment.trim()) return;
    await api.addComment(card.id, { content: newComment });
    setNewComment(''); await refresh();
  };
  const handleAddCheck = async () => {
    if (!newCheckItem.trim()) return;
    await api.addChecklistItem(card.id, { title: newCheckItem });
    setNewCheckItem(''); setAddingCheck(false); await refresh();
  };
  const handleToggleCheck  = async (item: ChecklistItem) => { await api.toggleChecklistItem(card.id, item.id, { is_completed: !item.is_completed }); await refresh(); };
  const handleDeleteCheck  = async (itemId: number) => { await api.deleteChecklistItem(card.id, itemId); await refresh(); };
  const handleLabelToggle  = async (labelId: number) => {
    const has = card.labels?.some((l: any) => l.id === labelId);
    if (has) await api.removeLabelFromCard(card.id, labelId); else await api.addLabelToCard(card.id, labelId);
    await refresh();
  };
  const handleMemberToggle = async (userId: number) => {
    const has = card.members?.some((m: any) => m.id === userId);
    if (has) await api.removeMember(card.id, userId); else await api.assignMember(card.id, userId);
    await refresh();
  };
  const handleSetDueDate = async (date: string) => {
    await api.updateCard(card.id, { due_date: date ? new Date(date).toISOString() : null });
    setShowDates(false); await refresh();
  };
  const handleArchive = async () => { await api.updateCard(card.id, { is_archived: !card.is_archived }); onClose(); await refresh(); };
  const handleDelete  = async () => { if (!confirm('Delete this card permanently?')) return; await api.deleteCard(card.id); onClose(); await refresh(); };
  const handleCoverColor = async (color: string | null) => {
    await api.updateCard(card.id, { cover_image_color: color });
    setCard((prev: any) => ({ ...prev, cover_image_color: color }));
    setShowCover(false); await refresh();
  };

  const checklists    = card.checklists || [];
  const doneCount     = checklists.filter((c: any) => c.is_completed).length;
  const checkProgress = checklists.length > 0 ? Math.round((doneCount / checklists.length) * 100) : 0;
  const API_BASE      = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8123';

  const coverColors = ['#0052cc','#00875a','#ff5630','#ff991f','#6554c0','#00b8d9','#403294','#e6225e','#172b4d','#344563'];

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'48px 16px',overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#282e33',borderRadius:12,width:'100%',maxWidth:768,position:'relative',flexShrink:0,animation:'fadeInUp 0.15s ease' }}>

        {card.cover_image_color && (
          <div style={{ height:128,background:card.cover_image_color,borderRadius:'12px 12px 0 0',position:'relative' }}>
            <button onClick={onClose} style={{ position:'absolute',top:12,right:12,background:'rgba(0,0,0,0.35)',borderRadius:6,width:32,height:32,border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:'white',cursor:'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        {!card.cover_image_color && (
          <button onClick={onClose} style={{ position:'absolute',top:12,right:12,zIndex:10,background:'transparent',border:'none',width:32,height:32,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'#9fadbc',cursor:'pointer' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}

        <div style={{ display:'flex',padding:'16px 16px 24px',gap:16 }}>
          {/* ── Main ── */}
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9fadbc" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span style={{ fontSize:13,color:'#9fadbc' }}>in list <span style={{ color:'#b6c2cf',fontWeight:600,textDecoration:'underline',cursor:'pointer' }}>{list.title}</span></span>
            </div>

            <div style={{ marginBottom:20,paddingLeft:24 }}>
              {editTitle ? (
                <textarea autoFocus value={titleVal} onChange={e=>setTitleVal(e.target.value)} onBlur={saveTitle}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveTitle();}if(e.key==='Escape')setEditTitle(false);}} rows={2}
                  style={{ width:'100%',fontWeight:700,fontSize:20,resize:'none',padding:'4px 8px',background:'#22272b',borderRadius:4,color:'#b6c2cf',border:'2px solid #388bff',outline:'none',lineHeight:1.3,boxSizing:'border-box' }}/>
              ) : (
                <h2 onClick={()=>{setEditTitle(true);setTitleVal(card.title);}}
                  style={{ fontSize:20,fontWeight:700,color:'#b6c2cf',cursor:'pointer',padding:'4px 8px',borderRadius:4,lineHeight:1.3,wordBreak:'break-word',margin:0 }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{card.title}</h2>
              )}
            </div>

            {(card.labels?.length>0||card.members?.length>0||card.due_date)&&(
              <div style={{ display:'flex',flexWrap:'wrap',gap:16,marginBottom:20,paddingLeft:24 }}>
                {card.labels?.length>0&&(<div><Label11>Labels</Label11><div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>{card.labels.map((l:any)=>(<span key={l.id} style={{ padding:'4px 10px',borderRadius:4,fontSize:12,fontWeight:600,background:l.color_code,color:'white' }}>{l.name}</span>))}</div></div>)}
                {card.members?.length>0&&(<div><Label11>Members</Label11><div style={{ display:'flex',gap:4 }}>{card.members.map((m:any)=>(<div key={m.id} title={m.name} style={{ width:28,height:28,borderRadius:'50%',background:mColor(m.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white' }}>{m.name[0].toUpperCase()}</div>))}</div></div>)}
                {card.due_date&&(<div><Label11>Due date</Label11><span style={{ padding:'4px 10px',borderRadius:4,fontSize:13,fontWeight:500,background:new Date(card.due_date)<new Date()?'rgba(248,113,104,0.2)':'rgba(255,255,255,0.1)',color:new Date(card.due_date)<new Date()?'#f87168':'#b6c2cf' }}>{new Date(card.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>)}
              </div>
            )}

            {/* Description */}
            <Section icon={descIcon} title="Description">
              {editDesc ? (
                <div>
                  <textarea autoFocus value={descVal} onChange={e=>setDescVal(e.target.value)} rows={5} placeholder="Add a more detailed description…"
                    style={{ width:'100%',resize:'vertical',padding:'8px 12px',background:'#22272b',borderRadius:6,color:'#b6c2cf',border:'2px solid #388bff',fontSize:14,lineHeight:1.6,outline:'none',boxSizing:'border-box' }}/>
                  <div style={{ display:'flex',gap:6,marginTop:8 }}><Btn primary onClick={saveDesc}>Save</Btn><Btn onClick={()=>{setEditDesc(false);setDescVal(card.description||'');}}>Cancel</Btn></div>
                </div>
              ):(
                <div onClick={()=>{setEditDesc(true);setDescVal(card.description||'');}}
                  style={{ minHeight:56,padding:'8px 12px',borderRadius:8,background:card.description?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.06)',color:card.description?'#b6c2cf':'#9fadbc',cursor:'pointer',fontSize:14,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                  onMouseLeave={e=>e.currentTarget.style.background=card.description?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.06)'}>
                  {card.description||'Add a more detailed description…'}
                </div>
              )}
            </Section>

            {/* Checklist */}
            {checklists.length>0&&(
              <Section icon={checkIcon} title="Checklist" rightContent={<span style={{ fontSize:12,color:'#9fadbc' }}>{checkProgress}%</span>}>
                <div style={{ height:6,background:'rgba(255,255,255,0.1)',borderRadius:4,marginBottom:10,overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${checkProgress}%`,background:checkProgress===100?'#4bce97':'#0c66e4',borderRadius:4,transition:'width 0.3s ease' }}/>
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:1 }}>
                  {checklists.map((item:any)=>(
                    <div key={item.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'6px 8px',borderRadius:6 }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <input type="checkbox" checked={item.is_completed} onChange={()=>handleToggleCheck(item)} style={{ width:16,height:16,accentColor:'#0c66e4',cursor:'pointer',flexShrink:0 }}/>
                      <span style={{ flex:1,fontSize:14,color:item.is_completed?'#9fadbc':'#b6c2cf',textDecoration:item.is_completed?'line-through':'none' }}>{item.title}</span>
                      <button onClick={()=>handleDeleteCheck(item.id)} style={{ color:'#9fadbc',padding:'2px 6px',fontSize:16,background:'none',border:'none',cursor:'pointer',opacity:0,borderRadius:4 }}
                        onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.background='rgba(255,255,255,0.1)';}}
                        onMouseLeave={e=>{e.currentTarget.style.opacity='0';e.currentTarget.style.background='none';}}>×</button>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {addingCheck&&(
              <div style={{ marginBottom:20,paddingLeft:24 }}>
                <input autoFocus value={newCheckItem} onChange={e=>setNewCheckItem(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')handleAddCheck();if(e.key==='Escape')setAddingCheck(false);}}
                  placeholder="Add an item…"
                  style={{ width:'100%',padding:'8px 12px',background:'#22272b',borderRadius:6,color:'#b6c2cf',border:'2px solid #388bff',marginBottom:8,fontSize:14,outline:'none',boxSizing:'border-box' }}/>
                <div style={{ display:'flex',gap:6 }}><Btn primary onClick={handleAddCheck}>Add</Btn><Btn onClick={()=>setAddingCheck(false)}>Cancel</Btn></div>
              </div>
            )}

            {/* ── Attachments — always shown, fetched directly ── */}
            <Section
              icon={attachIconLg}
              title={attachments.length > 0 ? `Attachments (${attachments.length})` : 'Attachments'}
              rightContent={
                <button onClick={triggerFileUpload} disabled={loading}
                  style={{ fontSize:12,color:'#9fadbc',background:'rgba(255,255,255,0.08)',border:'none',borderRadius:4,padding:'3px 10px',cursor:loading?'default':'pointer',display:'flex',alignItems:'center',gap:4,opacity:loading?0.5:1 }}
                  onMouseEnter={e=>{if(!loading)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.14)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.08)';}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {loading ? 'Uploading…' : 'Add'}
                </button>
              }
            >
              {attachments.length === 0 ? (
                <div onClick={triggerFileUpload}
                  style={{ padding:'14px 16px',borderRadius:8,border:'1px dashed rgba(255,255,255,0.15)',color:'#9fadbc',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Click to attach a file
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  {attachments.map((att:any)=>{
                    const name = att.file_name || att.file_url?.split('/').pop() || 'File';
                    const ext  = (name.split('.').pop()||'file').toUpperCase().slice(0,4);
                    const col  = extColor(name);
                    const url  = `${API_BASE}${att.file_url}`;
                    return (
                      <div key={att.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'rgba(255,255,255,0.04)',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ width:44,height:36,borderRadius:6,background:col+'22',border:`1px solid ${col}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <span style={{ fontSize:9,fontWeight:800,color:col,letterSpacing:'0.05em' }}>{ext}</span>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,color:'#b6c2cf',fontWeight:500,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name}</div>
                          <div style={{ fontSize:11,color:'#9fadbc' }}>
                            {att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Uploaded'}
                          </div>
                        </div>
                        <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                          <a href={url} target="_blank" rel="noreferrer"
                            style={{ fontSize:12,color:'#b6c2cf',padding:'4px 8px',borderRadius:4,background:'rgba(255,255,255,0.08)',textDecoration:'none',display:'flex',alignItems:'center',gap:3 }}
                            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.16)'}
                            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.08)'}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            View
                          </a>
                          <a href={url} download={name}
                            style={{ fontSize:12,color:'#579dff',padding:'4px 8px',borderRadius:4,background:'rgba(87,157,255,0.1)',textDecoration:'none',display:'flex',alignItems:'center',gap:3 }}
                            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(87,157,255,0.2)'}
                            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='rgba(87,157,255,0.1)'}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {uploadError&&(
              <div style={{ margin:'-12px 0 16px 24px',padding:'8px 12px',background:'rgba(248,113,104,0.12)',border:'1px solid rgba(248,113,104,0.3)',borderRadius:6,fontSize:13,color:'#f87168' }}>
                Upload failed: {uploadError}
              </div>
            )}

            {/* Activity */}
            <Section icon={commentIcon} title="Activity">
              <div style={{ display:'flex',gap:10,marginBottom:16 }}>
                <div style={{ width:32,height:32,borderRadius:'50%',flexShrink:0,background:'#0c66e4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white' }}>
                  {(useStore.getState() as any).currentUserEmail?.[0]?.toUpperCase()||'U'}
                </div>
                <div style={{ flex:1 }}>
                  <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleComment();}} placeholder="Write a comment…"
                    style={{ width:'100%',padding:'8px 12px',background:'rgba(255,255,255,0.06)',borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',color:'#b6c2cf',fontSize:14,outline:'none',boxSizing:'border-box' }}
                    onFocus={e=>e.currentTarget.style.borderColor='#388bff'}
                    onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'}/>
                  {newComment&&(<div style={{ display:'flex',gap:6,marginTop:8 }}><Btn primary onClick={handleComment}>Save</Btn><Btn onClick={()=>setNewComment('')}>Cancel</Btn></div>)}
                </div>
              </div>
              {card.comments?.map((c:any,i:number)=>(
                <div key={i} style={{ display:'flex',gap:10,marginBottom:12 }}>
                  <div style={{ width:32,height:32,borderRadius:'50%',flexShrink:0,background:'#6554c0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white' }}>
                    {c.content?.[0]?.toUpperCase()||'U'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,color:'#9fadbc',marginBottom:4 }}><strong style={{ color:'#b6c2cf',marginRight:6 }}>Member</strong>{c.created_at?new Date(c.created_at).toLocaleDateString():''}</div>
                    <div style={{ background:'rgba(255,255,255,0.06)',padding:'8px 12px',borderRadius:8,fontSize:14,color:'#b6c2cf',border:'1px solid rgba(255,255,255,0.08)' }}>{c.content}</div>
                  </div>
                </div>
              ))}
            </Section>
          </div>

          {/* ── Sidebar ── */}
          <div style={{ width:176,flexShrink:0 }}>
            <SidebarSection title="Add to card">
              {[
                {label:'Members',  icon:membersIcon,onClick:()=>{setShowMembers(!showMembers);setShowLabels(false);setShowDates(false);setShowCover(false);},active:showMembers},
                {label:'Labels',   icon:labelsIcon, onClick:()=>{setShowLabels(!showLabels);setShowMembers(false);setShowDates(false);setShowCover(false);},active:showLabels},
                {label:'Checklist',icon:checkIcon2, onClick:()=>setAddingCheck(true),active:false},
                {label:'Dates',    icon:datesIcon,  onClick:()=>{setShowDates(!showDates);setShowMembers(false);setShowLabels(false);setShowCover(false);},active:showDates},
                {label:'Cover',    icon:coverIcon,  onClick:()=>{setShowCover(!showCover);setShowMembers(false);setShowLabels(false);setShowDates(false);},active:showCover},
              ].map(btn=>(<SidebarBtn key={btn.label} icon={btn.icon} active={btn.active} onClick={btn.onClick}>{btn.label}</SidebarBtn>))}
              <SidebarBtn icon={attachIcon} active={false} onClick={triggerFileUpload}>{loading?'Uploading…':'Attachment'}</SidebarBtn>
              {attachments.length>0&&(
                <div style={{ fontSize:11,color:'#9fadbc',padding:'2px 10px 4px',display:'flex',alignItems:'center',gap:4 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4bce97" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  <span style={{ color:'#4bce97' }}>{attachments.length}</span> attached
                </div>
              )}
            </SidebarSection>

            {showMembers&&(<div style={popoverStyle}><div style={popoverTitle}>Members</div>{users?.map((u:any)=>{const assigned=card.members?.some((m:any)=>m.id===u.id);return(<button key={u.id} onClick={()=>handleMemberToggle(u.id)} style={{ display:'flex',alignItems:'center',gap:8,width:'100%',padding:'6px 8px',borderRadius:6,background:assigned?'rgba(255,255,255,0.1)':'transparent',border:'none',cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'} onMouseLeave={e=>e.currentTarget.style.background=assigned?'rgba(255,255,255,0.1)':'transparent'}><div style={{ width:24,height:24,borderRadius:'50%',background:mColor(u.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white',flexShrink:0 }}>{u.name[0]}</div><span style={{ fontSize:13,color:'#b6c2cf',flex:1,textAlign:'left' }}>{u.name}</span>{assigned&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4bce97" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</button>);})}</div>)}
            {showLabels&&(<div style={popoverStyle}><div style={popoverTitle}>Labels</div>{labels?.map((l:any)=>{const active=card.labels?.some((cl:any)=>cl.id===l.id);return(<button key={l.id} onClick={()=>handleLabelToggle(l.id)} style={{ display:'flex',alignItems:'center',gap:8,width:'100%',padding:'5px 8px',borderRadius:4,background:'transparent',border:'none',cursor:'pointer',marginBottom:2 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><span style={{ width:48,height:20,borderRadius:3,background:l.color_code,flexShrink:0 }}/><span style={{ fontSize:12,color:'#b6c2cf',flex:1,textAlign:'left' }}>{l.name}</span>{active&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4bce97" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</button>);})}</div>)}
            {showDates&&(<div style={popoverStyle}><div style={popoverTitle}>Due Date</div><input type="date" defaultValue={card.due_date?card.due_date.split('T')[0]:''} onChange={e=>handleSetDueDate(e.target.value)} style={{ width:'100%',padding:'6px 8px',borderRadius:4,background:'#22272b',color:'#b6c2cf',border:'1px solid rgba(255,255,255,0.2)',fontSize:13,boxSizing:'border-box' }}/>{card.due_date&&(<button onClick={()=>handleSetDueDate('')} style={{ marginTop:8,fontSize:12,color:'#f87168',background:'none',border:'none',cursor:'pointer',padding:'4px 0' }}>Remove date</button>)}</div>)}
            {showCover&&(<div style={popoverStyle}><div style={popoverTitle}>Cover Color</div><div style={{ display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:6,marginBottom:8 }}>{coverColors.map(color=>(<button key={color} onClick={()=>handleCoverColor(color)} style={{ height:28,borderRadius:6,background:color,border:'none',cursor:'pointer',outline:card.cover_image_color===color?'3px solid white':'3px solid transparent',transition:'transform 0.1s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>))}</div>{card.cover_image_color&&(<button onClick={()=>handleCoverColor(null)} style={{ width:'100%',padding:'6px',fontSize:12,color:'#9fadbc',background:'rgba(255,255,255,0.06)',border:'none',borderRadius:4,cursor:'pointer' }}>Remove cover</button>)}</div>)}

            <SidebarSection title="Actions">
              <SidebarBtn icon={archiveIcon} onClick={handleArchive}>{card.is_archived?'Send to board':'Archive'}</SidebarBtn>
              <SidebarBtn icon={deleteIcon} onClick={handleDelete} danger>Delete card</SidebarBtn>
            </SidebarSection>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function Label11({children}:{children:React.ReactNode}){return <div style={{ fontSize:11,fontWeight:700,color:'#9fadbc',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em' }}>{children}</div>;}
function Section({icon,title,children,rightContent}:any){return(<div style={{ marginBottom:24 }}><div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>{icon}<span style={{ fontWeight:700,fontSize:15,color:'#b6c2cf' }}>{title}</span>{rightContent&&<div style={{ marginLeft:'auto' }}>{rightContent}</div>}</div><div style={{ paddingLeft:24 }}>{children}</div></div>);}
function SidebarSection({title,children}:any){return(<div style={{ marginBottom:16 }}><div style={{ fontSize:11,fontWeight:700,color:'#9fadbc',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.04em' }}>{title}</div>{children}</div>);}
function SidebarBtn({icon,children,onClick,active,danger}:any){return(<button onClick={onClick} style={{ display:'flex',alignItems:'center',gap:8,width:'100%',padding:'6px 10px',borderRadius:4,marginBottom:4,fontSize:13,background:active?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.06)',color:danger?'#f87168':'#b6c2cf',border:'none',cursor:'pointer',fontWeight:500 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'} onMouseLeave={e=>e.currentTarget.style.background=active?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.06)'}>{icon}{children}</button>);}
function Btn({children,onClick,primary}:any){return(<button onClick={onClick} style={{ padding:'6px 12px',borderRadius:4,fontSize:14,fontWeight:500,background:primary?'#0c66e4':'rgba(255,255,255,0.1)',color:primary?'white':'#b6c2cf',border:'none',cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background=primary?'#0055cc':'rgba(255,255,255,0.16)'} onMouseLeave={e=>e.currentTarget.style.background=primary?'#0c66e4':'rgba(255,255,255,0.1)'}>{children}</button>);}
function mColor(name:string){const c=['#0052cc','#00875a','#6554c0','#ff5630','#00b8d9'];let h=0;for(let i=0;i<name.length;i++)h=name.charCodeAt(i)+((h<<5)-h);return c[Math.abs(h)%c.length];}
function extColor(filename:string){const ext=filename?.split('.').pop()?.toLowerCase()||'';const map:Record<string,string>={pdf:'#f87168',png:'#4bce97',jpg:'#4bce97',jpeg:'#4bce97',gif:'#4bce97',mp4:'#579dff',mov:'#579dff',doc:'#0052cc',docx:'#0052cc',xls:'#00875a',xlsx:'#00875a',zip:'#ff991f'};return map[ext]||'#9fadbc';}

const popoverStyle:React.CSSProperties={background:'#282e33',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:10,marginBottom:8,boxShadow:'0 4px 12px rgba(0,0,0,0.4)'};
const popoverTitle:React.CSSProperties={fontSize:11,fontWeight:700,color:'#9fadbc',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.04em'};
const descIcon    =<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9fadbc" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const checkIcon   =<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9fadbc" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const attachIcon  =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const attachIconLg=<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9fadbc" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const commentIcon =<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9fadbc" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const membersIcon =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const labelsIcon  =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const checkIcon2  =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const datesIcon   =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const coverIcon   =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const archiveIcon =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const deleteIcon  =<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87168" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;