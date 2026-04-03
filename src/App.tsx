import { useState, useRef, useEffect } from "react";
import { Menu, Mic, Plus, X, Send, ClipboardList, ArrowRightCircle, FileText, User, Info, LogOut, Volume2, VolumeX, MessageSquare, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

const SYSTEM_PROMPT = `You are roleplaying as Marvin Webster, a 34-year-old male patient in an observation unit.
CASE: Chief complaint: sudden-onset severe headache ~6 hours ago, rated 9/10. Mild nausea, photophobia. No fever. PMH: Hypertension; lisinopril 10mg. FMH: Father stroke at 58. Social: electrician, wife, 2 kids.
SCRIPTED: "How can I help you today?" reply "I feel terrible, and have a cough and fever." | Name reply "Marvin Webster." | What happened reply "Terrible headache out of nowhere."
RULES: Plain language. Never volunteer info. 2-4 sentences. Never break character.`;

const STEPS = [
  {label:"History",       subs:[]},
  {label:"Physical Exam", subs:[]},
  {label:"Assessment",    subs:["Organize Key Findings","Write a Problem Statement","Select & Rank DDx","Select Tests"]},
  {label:"Test Results",  subs:[]},
  {label:"Diagnosis",     subs:[]},
  {label:"Orders",        subs:[]},
  {label:"SOAP Note",     subs:[]},
  {label:"Summary",       subs:[]},
];

const EHR_TABS = ["Info","HPI","Family Hx","Key Findings","Problem Statement","DDx","Physical Exam","Select Tests","Test Results","Diagnosis","Orders","SOAP Note"];

const TESTS = [
  {id:"cbc",   name:"CBC",        desc:"Complete Blood Count"},
  {id:"flu",   name:"Influenza",  desc:"Influenza A/B Rapid Antigen"},
  {id:"covid", name:"COVID",      desc:"COVID-19 Rapid Antigen"},
  {id:"uri",   name:"Viral Upper Respiratory Infection (URI)", desc:"Respiratory Viral Panel"},
];
const DX_LIST = [
  {id:"covid", name:"COVID",      desc:"COVID-19 Infection"},
  {id:"flu",   name:"Influenza",  desc:"Influenza A/B Infection"},
  {id:"uri",   name:"Viral Upper Respiratory Infection (URI)", desc:"Viral URI / Common Cold"},
];
const ORDER_LIST = [
  {id:"acet",  name:"Acetaminophen",                               desc:"500-1000 mg PO q6h PRN fever/pain"},
  {id:"dext",  name:"Dextromethorphan",                            desc:"10-20 mg PO q4h PRN cough"},
  {id:"salt",  name:"Saltwater gargle",                            desc:"1/4 tsp salt in 8 oz warm water q4h PRN"},
  {id:"note",  name:"Provide school/work note",                    desc:"Written documentation for absence"},
  {id:"rtc",   name:"Return to clinic in 2-3 days and PRN",       desc:"Follow-up as needed"},
  {id:"edu",   name:"Offered patient education on current status", desc:"Education provided to patient"},
];
const EXAMS = [
  {id:"eyes",  name:"Inspect Eyes",     cat:"Head & Eyes",   icon:"👁️", findings:["Eyelids: no ptosis, erythema, or swelling.","Conjunctivae: pink, no discharge.","Sclerae: anicteric.","Orbital area: no edema, redness, tenderness, or lesions noted."]},
  {id:"lungs", name:"Auscultate Lungs", cat:"Respiratory",   icon:"🫁", findings:[]},
  {id:"pulse", name:"Pulse",            cat:"Cardiovascular", icon:"💓", findings:[]},
];
const EXERCISES = [
  {id:1, type:"fill",  question:"This is the fill-in-the-blank question. How many _____", answer:"3"},
  {id:2, type:"multi", question:"This is multiple choice question. Select three:", choices:["Med 1","Med 2","Med 3","Med 4","Med 5"], answers:["Med 1","Med 3","Med 4"]},
  {id:3, type:"tf",    question:"This is the true/false question.", answer:"True"},
];
const GUIDANCE_ITEMS = [
  {title:"Elicit the full list of concerns", body:"Eliciting a full list of the patient's concerns builds rapport early and allows the clinician to gather the constellation of symptoms."},
  {title:"Characterize symptoms", body:"Semi-open-ended symptom characterization questions (OPQRST or OLDCARTS) allow the clinician to hear the story of the patients' symptoms from when they started."},
  {title:"Use closed-ended or clinician-centered questions", bullets:["Medication and allergy questions inform treatment planning.","Questions about sick contacts and vaccination status inform risk for specific conditions on the differential."]},
];
const FB_ROWS = [
  {grade:"CC Sx",    q:"How can I help you today?",                                    r:"I feel awful. I have a cough and body aches."},
  {grade:"Assoc Sx", q:"Do you have any other symptoms or concerns we should discuss?", r:"I have a headache."},
];

function useDrag(ip, is, mw, mh) {
  var dmw=mw||300, dmh=mh||200;
  var ps=useState(ip); var pos=ps[0]; var setPos=ps[1];
  var ss=useState(is); var size=ss[0]; var setSize=ss[1];
  var dr=useRef(null); var rr=useRef(null);
  useEffect(function(){
    function mv(e){ if(dr.current) setPos({x:dr.current.ox+(e.clientX-dr.current.sx),y:dr.current.oy+(e.clientY-dr.current.sy)}); if(rr.current) setSize({w:Math.max(dmw,rr.current.ow+(e.clientX-rr.current.sx)),h:Math.max(dmh,rr.current.oh+(e.clientY-rr.current.sy))}); }
    function up(){ dr.current=null; rr.current=null; }
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    return function(){ window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
  },[dmw,dmh]);
  return { pos:pos, setPos:setPos, size:size,
    onDrag:   function(e){ e.preventDefault(); dr.current={sx:e.clientX,sy:e.clientY,ox:pos.x,oy:pos.y}; },
    onResize: function(e){ e.preventDefault(); e.stopPropagation(); rr.current={sx:e.clientX,sy:e.clientY,ow:size.w,oh:size.h}; }
  };
}

function Grip(p){ return <div onMouseDown={p.onMouseDown} style={{position:"absolute",bottom:0,right:0,width:18,height:18,cursor:"nwse-resize",display:"flex",alignItems:"center",justifyContent:"center",color:"#d1d5db"}}><svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="10" x2="10" y2="0" stroke="currentColor" strokeWidth="1.5"/><line x1="4" y1="10" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="10" x2="10" y2="8" stroke="currentColor" strokeWidth="1.5"/></svg></div>; }
function FAB(p){ return <button onClick={p.onClick} title={p.label} style={{width:46,height:46,borderRadius:"50%",background:p.bg,border:p.border||"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",outline:"none",flexShrink:0,transition:"transform .15s"}} onMouseOver={function(e){e.currentTarget.style.transform="scale(1.1)";}} onMouseOut={function(e){e.currentTarget.style.transform="scale(1)";}}>{ p.children}</button>; }
function Eye(p){ var c=p.color||"currentColor"; return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function ExamIco(p){ var c=p.color||"white"; return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function PenIco(p){ var c=(p&&p.color)||"white"; return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>; }
function Chk(){ return <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function Dots(){ return <div style={{display:"flex",gap:4,marginBottom:6}}>{[0,1,2].map(function(i){ return <div key={i} style={{width:8,height:8,borderRadius:"50%",background:"rgba(255,255,255,0.35)"}}/>; })}</div>; }
function CheckRow(p){ var a=p.accent||"#7B6FA8",bg=p.checked?(p.checkedBg||"#eff6ff"):"white"; return <div onClick={p.onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",border:"2px solid "+(p.checked?a:"#e5e7eb"),borderRadius:12,cursor:"pointer",background:bg,userSelect:"none"}}><div style={{width:20,height:20,borderRadius:5,flexShrink:0,border:"2px solid "+(p.checked?a:"#d1d5db"),background:p.checked?a:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>{p.checked&&<Chk/>}</div><div style={{flex:1}}><p style={{margin:0,fontWeight:700,fontSize:12,color:p.checked?a:"#1f2937"}}>{p.name}</p><p style={{margin:"3px 0 0",fontSize:10,color:"#9ca3af"}}>{p.desc}</p></div></div>; }
function PanelHdr(p){ return <div onMouseDown={p.onDrag} style={{padding:"12px 18px",background:p.bg,color:"white",flexShrink:0,cursor:"move",userSelect:"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:8}}>{p.icon}<span style={{fontWeight:700,fontSize:13}}>{p.title}</span></div><button onClick={p.onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.8)",display:"flex"}}><X size={16}/></button></div>; }

function EHRSection(p) {
  var s=p.section;
  function togArr(arr,setter,id){ if(arr.indexOf(id)!==-1) setter(arr.filter(function(x){return x!==id;})); else setter(arr.concat([id])); }

  if(s==="Info") return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Patient","Marvin Webster"],["DOB","March 3, 1992"],["Age","34"],["Sex","Male"],["MRN","MRN-00423819"],["Setting","Observation Unit"],["Status","Obs"],["Attending","Doug Miller"],["BP","158/96 mmHg"],["HR","92 bpm"],["RR","16 /min"],["Temp","37.1 C"],["SpO2","98% RA"],["Allergies","NKDA"],["Medications","Lisinopril 10 mg"],["Chief Complaint","To be elicited"]].map(function(r){return <div key={r[0]} style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:10}}><p style={{color:"#9ca3af",fontWeight:500,fontSize:10,margin:"0 0 2px"}}>{r[0]}</p><p style={{color:"#111827",fontWeight:600,margin:0}}>{r[1]}</p></div>;})}</div>;

  if(s==="HPI") return <div><p style={{color:"#6b7280",marginBottom:12}}>Document the HPI using OLDCARTS.</p><textarea value={p.hpi} onChange={function(e){p.setHpi(e.target.value);}} placeholder={"Onset:\nLocation:\nDuration:\nCharacter:\nAggravating/Alleviating:\nRadiation:\nTiming:\nSeverity:"} style={{width:"100%",height:280,border:"1px solid #e5e7eb",borderRadius:12,padding:12,fontSize:12,lineHeight:1.7,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/><p style={{color:"#d1d5db",textAlign:"right",fontSize:10,margin:"4px 0 0"}}>{p.hpi.length} chars</p></div>;

  if(s==="Family Hx") return <div><p style={{color:"#6b7280",marginBottom:12}}>Document relevant family medical history.</p><textarea value={p.fh} onChange={function(e){p.setFh(e.target.value);}} placeholder={"Father:\nMother:\nSiblings:\nOther:"} style={{width:"100%",height:280,border:"1px solid #e5e7eb",borderRadius:12,padding:12,fontSize:12,lineHeight:1.7,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/><p style={{color:"#d1d5db",textAlign:"right",fontSize:10,margin:"4px 0 0"}}>{p.fh.length} chars</p></div>;

  if(s==="Key Findings") return <div><p style={{color:"#6b7280",marginBottom:12}}>Auto-extracted from conversation. Add findings manually below.</p><div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>{p.findings.length===0&&<p style={{color:"#d1d5db",fontStyle:"italic",textAlign:"center",padding:"24px 0",fontSize:11}}>No findings yet.</p>}{p.findings.map(function(f,i){return <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#eff6ff",border:"1px solid #dbeafe",borderRadius:8,padding:"8px 12px"}}><span style={{color:"#1e40af",flex:1}}>{f}</span><button onClick={function(){p.setFindings(p.findings.filter(function(_,j){return j!==i;}));}} style={{background:"none",border:"none",cursor:"pointer",color:"#93c5fd",fontSize:18,marginLeft:8}}>x</button></div>;})} </div><div style={{display:"flex",gap:8}}><input value={p.nf} onChange={function(e){p.setNf(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&p.nf.trim()){p.setFindings(p.findings.concat([p.nf]));p.setNf("");}}} placeholder="Type a finding and press Enter or Add…" style={{flex:1,border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",fontSize:12,outline:"none",color:"#1f2937"}}/><button onClick={function(){if(p.nf.trim()){p.setFindings(p.findings.concat([p.nf]));p.setNf("");}}} style={{background:"#7B6FA8",color:"white",border:"none",borderRadius:8,padding:"9px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4,flexShrink:0}}><Plus size={12}/> Add</button></div></div>;

  if(s==="Problem Statement") return <div><p style={{color:"#6b7280",marginBottom:12}}>Summarize the patient's clinical problem.</p>{p.findings.length>0?<div style={{marginBottom:14,padding:"10px 14px",background:"#eff6ff",border:"1px solid #dbeafe",borderRadius:10}}><p style={{margin:"0 0 6px",fontWeight:700,fontSize:10,color:"#7B6FA8",textTransform:"uppercase",letterSpacing:"0.05em"}}>Key Findings</p><p style={{margin:0,fontSize:12,color:"#1e40af",lineHeight:1.7}}>{p.findings.join(", ")}</p></div>:<div style={{marginBottom:14,padding:"10px 14px",background:"#f9fafb",border:"1px dashed #e5e7eb",borderRadius:10}}><p style={{margin:0,fontSize:11,color:"#d1d5db",fontStyle:"italic"}}>No key findings yet.</p></div>}<textarea value={p.prob} onChange={function(e){p.setProb(e.target.value);}} placeholder="e.g. 34-year-old male presenting with sudden-onset severe headache…" style={{width:"100%",height:220,border:"1px solid #e5e7eb",borderRadius:12,padding:12,fontSize:12,lineHeight:1.7,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/><p style={{color:"#d1d5db",textAlign:"right",fontSize:10,margin:"4px 0 0"}}>{p.prob.length} chars</p></div>;

  if(s==="DDx"){
    function addDdx(){ if(p.ndx.trim()){p.setDdx(p.ddx.concat([{label:p.ndx,tag:"Alt"}]));p.setNdx("");} }
    function setTag(i,tag){ p.setDdx(p.ddx.map(function(x,j){ if(j!==i) return x; return {label:x.label,tag:tag}; })); }
    return <div><p style={{color:"#6b7280",marginBottom:14}}>Add diagnoses and classify each as Lead or Alternative.</p><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>{p.ddx.length===0&&<p style={{color:"#d1d5db",fontStyle:"italic",textAlign:"center",padding:"24px 0",fontSize:11}}>No diagnoses added yet.</p>}{p.ddx.map(function(d,i){return <div key={i} style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px"}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}><span style={{color:"#1f2937",fontWeight:600,fontSize:12,flex:1,lineHeight:1.4}}>{d.label}</span><button onClick={function(){p.setDdx(p.ddx.filter(function(_,j){return j!==i;}));}} style={{background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:18,lineHeight:1}}>x</button></div><div style={{display:"flex",gap:20,marginTop:8}}><label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,color:d.tag==="Lead"?"#7B6FA8":"#9ca3af",fontWeight:d.tag==="Lead"?700:400}}><input type="radio" name={"ddx"+i} checked={d.tag==="Lead"} onChange={function(){setTag(i,"Lead");}} style={{cursor:"pointer"}}/> Lead Diagnosis</label><label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,color:d.tag==="Alt"?"#6b7280":"#9ca3af",fontWeight:d.tag==="Alt"?700:400}}><input type="radio" name={"ddx"+i} checked={d.tag==="Alt"} onChange={function(){setTag(i,"Alt");}} style={{cursor:"pointer"}}/> Alternative</label></div></div>;})} </div><div style={{display:"flex",gap:8}}><input value={p.ndx} onChange={function(e){p.setNdx(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addDdx();}} placeholder="Type a diagnosis…" style={{flex:1,border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",fontSize:12,outline:"none",color:"#1f2937"}}/><button onClick={addDdx} style={{background:"#7B6FA8",color:"white",border:"none",borderRadius:8,padding:"9px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4,flexShrink:0}}><Plus size={12}/> Add</button></div></div>;
  }

  if(s==="Physical Exam"){
    var peRows=[
      {key:"general",       label:"General"},
      {key:"heent",         label:"HEENT"},
      {key:"neck",          label:"Neck"},
      {key:"respiratory",   label:"Respiratory"},
      {key:"cardiovascular",label:"Cardiovascular"},
      {key:"abdomen",       label:"Abdomen"},
      {key:"neuro",         label:"Neurological"},
      {key:"skin",          label:"Skin"},
    ];
    function updatePe(key,val){
      p.setPeFields(function(prev){
        var next={};
        for(var k in prev) next[k]=prev[k];
        next[key]=val;
        return next;
      });
    }
    return (
      <div>
        <p style={{color:"#6b7280",marginBottom:16,lineHeight:1.6}}>Document physical examination findings for each system.</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {peRows.map(function(row){
            var val=(p.peFields&&p.peFields[row.key])||"";
            return (
              <div key={row.key} style={{border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"8px 14px",background:"#f8f9fa",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontWeight:700,fontSize:11,color:"#374151"}}>{row.label}</span>
                  {val.trim().length>0&&<span style={{fontSize:9,fontWeight:700,color:"#7B6FA8",background:"#ede9f6",padding:"1px 7px",borderRadius:999}}>DOCUMENTED</span>}
                </div>
                <textarea
                  value={val}
                  onChange={function(e){ updatePe(row.key,e.target.value); }}
                  placeholder={"Document "+row.label.toLowerCase()+" findings…"}
                  rows={2}
                  style={{width:"100%",border:"none",padding:"10px 14px",fontSize:12,lineHeight:1.6,resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#1f2937",background:"white"}}
                />
              </div>
            );
          })}
        </div>
        <p style={{color:"#d1d5db",textAlign:"right",fontSize:10,margin:"8px 0 0"}}>
          {peRows.filter(function(r){return p.peFields&&p.peFields[r.key]&&p.peFields[r.key].trim().length>0;}).length} / {peRows.length} systems documented
        </p>
      </div>
    );
  }

  if(s==="Select Tests") return <div><p style={{color:"#6b7280",marginBottom:16}}>Select one or more diagnostic tests to order.</p><div style={{display:"flex",flexDirection:"column",gap:10}}>{TESTS.map(function(t){ return <CheckRow key={t.id} checked={p.selTests.indexOf(t.id)!==-1} onClick={function(){togArr(p.selTests,p.setSelTests,t.id);}} name={t.name} desc={t.desc}/>; })}</div>{p.selTests.length>0&&<div style={{marginTop:16,padding:"12px 16px",background:"#eff6ff",border:"1px solid #dbeafe",borderRadius:12}}><p style={{margin:"0 0 6px",fontWeight:700,fontSize:11,color:"#7B6FA8"}}>Tests ordered ({p.selTests.length}):</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{p.selTests.map(function(id){var t=null;for(var i=0;i<TESTS.length;i++){if(TESTS[i].id===id){t=TESTS[i];break;}}return t?<span key={id} style={{background:"#7B6FA8",color:"white",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:999}}>{t.name}</span>:null;})}</div></div>}</div>;

  if(s==="Test Results") return <div><p style={{color:"#6b7280",marginBottom:16}}>Results from ordered diagnostic tests.</p><div style={{border:"2px solid #ef4444",borderRadius:12,overflow:"hidden",marginBottom:10}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"#fef2f2"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🦠</span><div><p style={{margin:0,fontWeight:700,fontSize:12,color:"#991b1b"}}>Influenza A/B Rapid Antigen</p><p style={{margin:"2px 0 0",fontSize:10,color:"#9ca3af"}}>Rapid Antigen Test</p></div></div><span style={{background:"#ef4444",color:"white",fontWeight:700,fontSize:11,padding:"3px 12px",borderRadius:999}}>POSITIVE</span></div><div style={{padding:"10px 16px",background:"white",borderTop:"1px solid #fee2e2"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>{[["Influenza A","Positive"],["Influenza B","Negative"],["Sensitivity","70-90%"],["Specificity","90-95%"]].map(function(r){return <div key={r[0]} style={{background:"#f9fafb",borderRadius:8,padding:"6px 10px"}}><p style={{margin:0,color:"#9ca3af",fontSize:10}}>{r[0]}</p><p style={{margin:"2px 0 0",fontWeight:600,color:r[1]==="Positive"?"#ef4444":"#374151"}}>{r[1]}</p></div>;})} </div><p style={{margin:0,fontSize:11,color:"#6b7280"}}>Positive for Influenza A. Consider antiviral therapy if within 48 hours of symptom onset.</p></div></div>{["CBC","COVID-19 Rapid Antigen","Respiratory Viral Panel"].map(function(name){return <div key={name} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f9fafb",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🧪</span><div><p style={{margin:0,fontWeight:600,fontSize:12,color:"#6b7280"}}>{name}</p><p style={{margin:"2px 0 0",fontSize:10,color:"#d1d5db"}}>Pending / Not ordered</p></div></div><span style={{background:"#f3f4f6",color:"#9ca3af",fontWeight:600,fontSize:11,padding:"3px 10px",borderRadius:999}}>PENDING</span></div>;})} </div>;

  if(s==="Diagnosis") return <div><p style={{color:"#6b7280",marginBottom:16}}>Select the diagnosis for this patient.</p><div style={{display:"flex",flexDirection:"column",gap:10}}>{DX_LIST.map(function(d){ return <CheckRow key={d.id} checked={p.selDx.indexOf(d.id)!==-1} onClick={function(){togArr(p.selDx,p.setSelDx,d.id);}} name={d.name} desc={d.desc}/>; })}</div>{p.selDx.length>0&&<div style={{marginTop:16,padding:"12px 16px",background:"#eff6ff",border:"1px solid #dbeafe",borderRadius:12}}><p style={{margin:"0 0 6px",fontWeight:700,fontSize:11,color:"#7B6FA8"}}>Selected ({p.selDx.length}):</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{p.selDx.map(function(id){var d=null;for(var i=0;i<DX_LIST.length;i++){if(DX_LIST[i].id===id){d=DX_LIST[i];break;}}return d?<span key={id} style={{background:"#7B6FA8",color:"white",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:999}}>{d.name}</span>:null;})}</div></div>}</div>;

  if(s==="Orders"){
    var srch=p.orderSearch||"";
    var filtered=[];
    for(var oi=0;oi<ORDER_LIST.length;oi++){
      if(ORDER_LIST[oi].name.toLowerCase().indexOf(srch.toLowerCase())!==-1) filtered.push(ORDER_LIST[oi]);
    }
    function toggleOrd(id){ if(p.selOrders.indexOf(id)!==-1) p.setSelOrders(p.selOrders.filter(function(x){return x!==id;})); else p.setSelOrders(p.selOrders.concat([id])); }
    function updDoc(key,val){ p.setOrderDoc(function(prev){ var next={}; if(prev){for(var k in prev){next[k]=prev[k];}} next[key]=val; return next; }); }
    return (
      <div>
        <p style={{color:"#6b7280",marginBottom:12}}>Search and select treatment orders for this patient.</p>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"7px 12px",marginBottom:14}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={srch} onChange={function(e){p.setOrderSearch(e.target.value);}} placeholder="Search orders…" style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:12,color:"#1f2937"}}/>
          {srch.length>0&&<button onClick={function(){p.setOrderSearch("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",padding:0,fontSize:16,lineHeight:1}}>x</button>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:0,marginBottom:14}}>
          {filtered.length===0&&<p style={{color:"#d1d5db",fontStyle:"italic",textAlign:"center",padding:"20px 0",fontSize:11}}>No orders match your search.</p>}
          {filtered.map(function(o){
            var checked=p.selOrders.indexOf(o.id)!==-1;
            var docKey="doc_"+o.id;
            var docVal=(p.orderDoc&&p.orderDoc[docKey])?p.orderDoc[docKey]:"";
            return (
              <div key={o.id} style={{border:"2px solid "+(checked?"#7B6FA8":"#e5e7eb"),borderRadius:12,overflow:"hidden",marginBottom:10}}>
                <div onClick={function(){ toggleOrd(o.id); }} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",cursor:"pointer",background:checked?"#f0fdf4":"white",userSelect:"none"}}>
                  <div style={{width:20,height:20,borderRadius:5,flexShrink:0,border:"2px solid "+(checked?"#7B6FA8":"#d1d5db"),background:checked?"#7B6FA8":"white",display:"flex",alignItems:"center",justifyContent:"center"}}>{checked&&<Chk/>}</div>
                  <div style={{flex:1}}><p style={{margin:0,fontWeight:700,fontSize:12,color:checked?"#478843":"#1f2937"}}>{o.name}</p><p style={{margin:"2px 0 0",fontSize:10,color:"#9ca3af"}}>{o.desc}</p></div>
                </div>
                <div style={{padding:"0 14px 10px",background:checked?"#f0fdf4":"#fafafa",borderTop:"1px solid "+(checked?"#c4b5e0":"#f3f4f6")}}>
                  <p style={{margin:"8px 0 4px",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>Documentation</p>
                  <textarea value={docVal} onChange={function(e){ updDoc(docKey,e.target.value); }} placeholder={"Notes for "+o.name+"…"} rows={2} style={{width:"100%",border:"1px solid "+(checked?"#86efac":"#e5e7eb"),borderRadius:8,padding:"7px 10px",fontSize:11,lineHeight:1.5,resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",background:"white",color:"#1f2937"}}/>
                </div>
              </div>
            );
          })}
        </div>
        {p.selOrders.length>0&&<div style={{padding:"12px 16px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12}}><p style={{margin:"0 0 6px",fontWeight:700,fontSize:11,color:"#478843"}}>Orders placed ({p.selOrders.length}):</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{p.selOrders.map(function(id){var found=null;for(var i=0;i<ORDER_LIST.length;i++){if(ORDER_LIST[i].id===id){found=ORDER_LIST[i];break;}}return found?<span key={id} style={{background:"#7B6FA8",color:"white",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:999}}>{found.name}</span>:null;})}</div></div>}
      </div>
    );
  }

  if(s==="SOAP Note") return <div style={{display:"flex",flexDirection:"column",height:"100%"}}><p style={{color:"#6b7280",marginBottom:12,flexShrink:0}}>Document the full encounter using SOAP format.</p><textarea value={p.soap} onChange={function(e){p.setSoap(e.target.value);}} placeholder={"SUBJECTIVE:\nChief Complaint:\nHPI:\n\nOBJECTIVE:\nVitals:\nPhysical Exam:\n\nASSESSMENT:\nPrimary Diagnosis:\n\nPLAN:\nTreatment:\nFollow-up:"} style={{flex:1,width:"100%",minHeight:320,border:"1px solid #e5e7eb",borderRadius:12,padding:14,fontSize:12,lineHeight:1.8,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/><p style={{color:"#d1d5db",textAlign:"right",fontSize:10,margin:"6px 0 0",flexShrink:0}}>{p.soap.length} chars</p></div>;

  return null;
}

function ExercisePanel(p){
  var as=useState({1:"",2:[],3:null}); var answers=as[0]; var setAnswers=as[1];
  var ss=useState({}); var submitted=ss[0]; var setSubmitted=ss[1];
  function setAns(id,val){ setAnswers(function(prev){ var n={}; for(var k in prev) n[k]=prev[k]; n[id]=val; return n; }); }
  function toggleChoice(c){ var cur=answers[2]; if(cur.indexOf(c)!==-1) setAns(2,cur.filter(function(x){return x!==c;})); else setAns(2,cur.concat([c])); }
  function checkCorrect(ex){ var a=answers[ex.id]; if(ex.type==="fill") return a.trim().toLowerCase()===ex.answer.toLowerCase(); if(ex.type==="tf") return a===ex.answer; if(ex.type==="multi") return ex.answers.length===a.length&&ex.answers.every(function(x){return a.indexOf(x)!==-1;}); return false; }
  function submit(ex){ var a=answers[ex.id]; var has=(ex.type==="fill"&&a.trim())||(ex.type==="multi"&&a.length>0)||(ex.type==="tf"&&a!==null); if(has) setSubmitted(function(prev){ var n={}; for(var k in prev) n[k]=prev[k]; n[ex.id]=true; return n; }); }
  function reset(){ setAnswers({1:"",2:[],3:null}); setSubmitted({}); }
  var doneCount=Object.values(submitted).filter(Boolean).length;
  return <div style={{position:"fixed",zIndex:50,left:p.drag.pos.x,top:p.drag.pos.y,width:p.drag.size.w,height:p.drag.size.h,display:"flex",flexDirection:"column",background:"white",borderRadius:16,boxShadow:"0 25px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
    <div onMouseDown={p.drag.onDrag} style={{padding:"12px 18px",background:"#7B6FA8",color:"white",flexShrink:0,cursor:"move",userSelect:"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Dots/><PenIco/><span style={{fontWeight:700,fontSize:13}}>Exercises</span></div><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:10,color:"rgba(255,255,255,0.75)"}}>{doneCount} / {EXERCISES.length} completed</span><button onClick={p.onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.8)",display:"flex"}}><X size={16}/></button></div></div>
    <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>
      {EXERCISES.map(function(ex,qi){
        var done=submitted[ex.id],correct=done&&checkCorrect(ex),ans=answers[ex.id];
        var bc=done?(correct?"#86efac":"#fca5a5"):"#e5e7eb";
        return <div key={ex.id} style={{background:"#f9fafb",border:"1.5px solid "+bc,borderRadius:14,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:24,height:24,borderRadius:"50%",background:"#7B6FA8",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"white",fontSize:11,fontWeight:700}}>{qi+1}</span></div><span style={{fontSize:10,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>{ex.type==="fill"?"Fill in the Blank":ex.type==="multi"?"Multiple Choice":"True / False"}</span></div>{done&&<span style={{fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:999,background:correct?"#ede9f6":"#fee2e2",color:correct?"#478843":"#dc2626"}}>{correct?"Correct":"Incorrect"}</span>}</div>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:600,color:"#1f2937",lineHeight:1.6}}>{ex.question}</p>
          {ex.type==="fill"&&<input value={ans} onChange={function(e){if(!done)setAns(1,e.target.value);}} placeholder="Type your answer…" readOnly={!!done} style={{width:"100%",border:"1px solid "+(done?(correct?"#86efac":"#fca5a5"):"#e5e7eb"),borderRadius:8,padding:"9px 12px",fontSize:12,outline:"none",color:"#1f2937",background:done?"#f9fafb":"white",boxSizing:"border-box"}}/>}
          {ex.type==="multi"&&<div style={{display:"flex",flexDirection:"column",gap:7}}>{ex.choices.map(function(c){var sel=ans.indexOf(c)!==-1,isRight=ex.answers.indexOf(c)!==-1;var bg="white",bd="1px solid #e5e7eb",cl="#1f2937";if(done){if(isRight){bg="#ede9f6";bd="1px solid #86efac";cl="#478843";}else if(sel){bg="#fee2e2";bd="1px solid #fca5a5";cl="#dc2626";}}else if(sel){bg="#eff6ff";bd="1px solid #93c5fd";cl="#7B6FA8";}return <div key={c} onClick={function(){if(!done)toggleChoice(c);}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",border:bd,borderRadius:10,cursor:done?"default":"pointer",background:bg,userSelect:"none"}}><div style={{width:16,height:16,borderRadius:4,border:"2px solid "+(sel?(done?(isRight?"#7B6FA8":"#dc2626"):"#7B6FA8"):"#d1d5db"),background:sel?(done?(isRight?"#7B6FA8":"#dc2626"):"#7B6FA8"):"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<Chk/>}</div><span style={{fontSize:12,fontWeight:sel?600:400,color:cl}}>{c}</span>{done&&isRight&&<span style={{marginLeft:"auto",fontSize:10,color:"#478843",fontWeight:600}}>✓</span>}</div>;})} </div>}
          {ex.type==="tf"&&<div style={{display:"flex",gap:10}}>{["True","False"].map(function(opt){var sel=ans===opt,isRight=ex.answer===opt;var bg="white",bd="1px solid #e5e7eb",cl="#374151";if(done){if(isRight){bg="#ede9f6";bd="1px solid #86efac";cl="#478843";}else if(sel){bg="#fee2e2";bd="1px solid #fca5a5";cl="#dc2626";}}else if(sel){bg="#eff6ff";bd="1px solid #93c5fd";cl="#7B6FA8";}return <div key={opt} onClick={function(){if(!done)setAns(3,opt);}} style={{flex:1,padding:"10px 0",textAlign:"center",border:bd,borderRadius:10,cursor:done?"default":"pointer",background:bg,fontWeight:sel?700:500,fontSize:13,color:cl,userSelect:"none"}}>{opt}{done&&isRight?" ✓":""}</div>;})} </div>}
          <div style={{marginTop:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>{done?<p style={{margin:0,fontSize:11,color:correct?"#478843":"#dc2626"}}>{correct?"Great job!":"Correct answer: "+(ex.type==="multi"?ex.answers.join(", "):ex.answer)}</p>:<span/>}{!done&&<button onClick={function(){submit(ex);}} style={{background:"#7B6FA8",color:"white",border:"none",borderRadius:8,padding:"7px 18px",fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:"auto",display:"block"}}>Submit</button>}</div>
        </div>;
      })}
    </div>
    <div style={{borderTop:"1px solid #e5e7eb",padding:"10px 20px",background:"#f9fafb",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#6b7280"}}>{doneCount} of {EXERCISES.length} answered</span><button onClick={reset} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 14px",fontSize:11,cursor:"pointer",color:"#6b7280"}}>Reset</button></div>
    <Grip onMouseDown={p.drag.onResize}/>
  </div>;
}

export default function App() {
  const [msgs,        setMsgs]        = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [soundOn,     setSoundOn]     = useState(false);
  const [patientImg,  setPatientImg]  = useState(`${import.meta.env.BASE_URL}patient.jpg`);
  const [logoSrc,     setLogoSrc]     = useState(null);
  const [ready,       setReady]       = useState(false);
  const [showChat,    setShowChat]    = useState(true);
  const [showEHR,     setShowEHR]     = useState(false);
  const [showObs,     setShowObs]     = useState(true);
  const [showGuid,    setShowGuid]    = useState(false);
  const [guidTab,     setGuidTab]     = useState("guidance");
  const [showInfo,    setShowInfo]    = useState(false);
  const [showExams,   setShowExams]   = useState(false);
  const [showEx,      setShowEx]      = useState(false);
  const [showProc,    setShowProc]    = useState(false);
  const [menu,        setMenu]        = useState(false);
  const [menuPage,    setMenuPage]    = useState(null);
  const [activeStep,  setActiveStep]  = useState(0);
  const [viewStep,    setViewStep]    = useState(0);
  const [viewSub,     setViewSub]     = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selExam,     setSelExam]     = useState(null);
  const [examSearch,  setExamSearch]  = useState("");
  const [ehrTab,      setEhrTab]      = useState("Info");
  const [hpi,         setHpi]         = useState("");
  const [fh,          setFh]          = useState("");
  const [prob,        setProb]        = useState("");
  const [findings,    setFindings]    = useState([]);
  const [nf,          setNf]          = useState("");
  const [ddx,         setDdx]         = useState([]);
  const [ndx,         setNdx]         = useState("");
  const [peFields,    setPeFields]    = useState({general:"",heent:"",neck:"",respiratory:"",cardiovascular:"",abdomen:"",neuro:"",skin:""});
  const [selTests,    setSelTests]    = useState([]);
  const [selDx,       setSelDx]       = useState([]);
  const [selOrders,   setSelOrders]   = useState([]);
  const [orderDoc,    setOrderDoc]    = useState({});
  const [orderSearch, setOrderSearch] = useState("");
  const [soap,        setSoap]        = useState("");

  const chatRef=useRef(null),inputRef=useRef(null),fileRef=useRef(null),logoRef=useRef(null);
  const synth=useRef(typeof window!=="undefined"?window.speechSynthesis:null);
  const sidebarW=sidebarOpen?210:48;
  const chat=useDrag({x:180,y:400},{w:580,h:290},320,200);
  const ehr=useDrag({x:200,y:80},{w:760,h:560},500,340);
  const guid=useDrag({x:200,y:80},{w:680,h:520},400,300);
  const infoP=useDrag({x:200,y:80},{w:480,h:320},320,220);
  const examP=useDrag({x:200,y:80},{w:540,h:420},340,280);
  const exP=useDrag({x:200,y:80},{w:560,h:520},380,320);
  const obsP=useDrag({x:200,y:80},{w:320,h:240},260,180);
  const menuP=useDrag({x:200,y:80},{w:220,h:200},180,160);

  useEffect(function(){
    var W=window.innerWidth,H=window.innerHeight;
    chat.setPos({x:Math.max(60,W-chat.size.w-16),y:Math.max(60,H-chat.size.h-80)});
    ehr.setPos({x:Math.max(60,(W-760)/2),y:Math.max(60,(H-560)/2)});
    guid.setPos({x:Math.max(60,(W-680)/2),y:Math.max(60,(H-520)/2)});
    infoP.setPos({x:Math.max(60,(W-480)/2),y:Math.max(60,(H-320)/2)});
    examP.setPos({x:Math.max(60,(W-540)/2),y:Math.max(60,(H-420)/2)});
    exP.setPos({x:Math.max(60,(W-560)/2),y:Math.max(60,(H-520)/2)});
    obsP.setPos({x:Math.max(60,W-320-130-32),y:16});
    menuP.setPos({x:16+sidebarW+12,y:16});
    setReady(true);
  },[]);
  useEffect(function(){ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[msgs,loading]);

  // Section-based default tools
  useEffect(function(){
    if(!ready) return;
    var W=window.innerWidth;
    if(viewStep===1){ // Physical Exam
      setShowObs(false);
      setShowEx(false);
      setShowEHR(true);
      ehr.setPos({x:Math.max(60,W-ehr.size.w-130-32),y:16});
    } else if(viewStep===2){ // Assessment
      setShowObs(false);
      setShowEHR(false);
      setShowEx(true);
      exP.setPos({x:Math.max(60,W-exP.size.w-130-32),y:16});
    } else {
      setShowEHR(false);
      setShowEx(false);
      setShowObs(true);
    }
  },[viewStep]);

  function speak(text){ if(!soundOn||!synth.current) return; synth.current.cancel(); var u=new SpeechSynthesisUtterance(text); u.rate=0.95; synth.current.speak(u); }
  function toggleSound(){ if(soundOn&&synth.current) synth.current.cancel(); setSoundOn(function(prev){return !prev;}); }
  function ask(q){
    var qq=q||input; if(!qq.trim()||loading) return;
    var t=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    var next=msgs.concat([{role:"user",text:qq,t:t}]);
    setMsgs(next); setInput(""); setLoading(true); if(inputRef.current) inputRef.current.focus();
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYSTEM_PROMPT,messages:next.map(function(m){return {role:m.role,content:m.text};})})})
      .then(function(r){return r.json();})
      .then(function(data){
        var reply=(data.content&&data.content[0]&&data.content[0].text)||"I'm not sure.";
        var rt=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
        setMsgs(function(prev){return prev.concat([{role:"assistant",text:reply,t:rt}]);});
        var rules=[[/cough/i,"Symptom: Cough"],[/fever/i,"Symptom: Fever"],[/nausea/i,"Nausea/vomiting"],[/headache/i,"Chief complaint: Headache"],[/hypertension/i,"Hx: Hypertension"]];
        rules.forEach(function(r){ if(r[0].test(reply)) setFindings(function(prev){return prev.indexOf(r[1])!==-1?prev:prev.concat([r[1]]);});});
        speak(reply); setLoading(false);
      }).catch(function(){ setMsgs(function(prev){return prev.concat([{role:"assistant",text:"Sorry, I didn't catch that.",t:""}]);}); setLoading(false); });
  }
  function loadFile(setter){ return function(e){ var f=e.target.files&&e.target.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(ev){setter(ev.target.result);}; r.readAsDataURL(f); }; }
  var qCount=msgs.filter(function(m){return m.role==="user";}).length;
  var filteredExams=EXAMS.filter(function(e){return e.name.toLowerCase().indexOf(examSearch.toLowerCase())!==-1;});

  function MenuContent(){
    var back=<button onClick={function(){setMenuPage(null);}} style={{color:"#7B6FA8",fontSize:11,marginBottom:12,display:"block",background:"none",border:"none",cursor:"pointer"}}>← Back</button>;
    if(!menuPage) return <nav style={{padding:"8px 0"}}>{[["Case Instructions","instructions"],["Patient Info","patient"],["Credits","credits"],["Close Case","close"]].map(function(item){return <button key={item[1]} onClick={function(){setMenuPage(item[1]);}} style={{width:"100%",textAlign:"left",padding:"12px 16px",fontSize:13,color:item[1]==="close"?"#dc2626":"#374151",background:"none",cursor:"pointer",border:"none",borderBottom:"1px solid #f0f0f0"}}>{item[0]}</button>;})}</nav>;
    return <div style={{padding:16,fontSize:12}}>{back}{menuPage==="instructions"&&<p style={{color:"#6b7280",lineHeight:1.6}}>Marvin Webster, 34M. Conduct a thorough history-taking interview.</p>}{menuPage==="patient"&&<div>{[["Name","Marvin Webster"],["Age","34"],["Sex","Male"],["Status","Obs"]].map(function(r){return <div key={r[0]} style={{display:"flex",gap:8,marginBottom:6}}><span style={{fontWeight:600,width:80,color:"#9ca3af"}}>{r[0]}:</span><span>{r[1]}</span></div>;})}</div>}{menuPage==="credits"&&<p style={{color:"#6b7280"}}>AI patient powered by Claude (Anthropic).</p>}{menuPage==="close"&&<div><p style={{color:"#6b7280",marginBottom:16}}>Are you sure? Progress will be lost.</p><button style={{width:"100%",background:"#dc2626",color:"white",padding:8,borderRadius:8,fontSize:12,fontWeight:"bold",cursor:"pointer",border:"none"}}>Yes, Close Case</button></div>}</div>;
  }

  var ehrProps={section:ehrTab,hpi:hpi,setHpi:setHpi,fh:fh,setFh:setFh,prob:prob,setProb:setProb,findings:findings,setFindings:setFindings,nf:nf,setNf:setNf,ddx:ddx,setDdx:setDdx,ndx:ndx,setNdx:setNdx,peFields:peFields,setPeFields:setPeFields,selTests:selTests,setSelTests:setSelTests,selDx:selDx,setSelDx:setSelDx,selOrders:selOrders,setSelOrders:setSelOrders,orderDoc:orderDoc,setOrderDoc:setOrderDoc,orderSearch:orderSearch,setOrderSearch:setOrderSearch,soap:soap,setSoap:setSoap};

  return (
    <div style={{position:"fixed",inset:0,overflow:"hidden",fontFamily:"system-ui,sans-serif",fontSize:12}}>
      {/* Background */}
      <div style={{position:"absolute",inset:0,zIndex:0,background:"linear-gradient(160deg,#e8eef6 0%,#dce5f0 30%,#eef1f5 60%,#f0f2f5 100%)"}}>
        <div style={{position:"absolute",inset:0,opacity:0.4,background:"radial-gradient(ellipse at 30% 20%,rgba(59,130,246,0.08) 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(59,130,246,0.05) 0%,transparent 50%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"35%",background:"linear-gradient(to top,rgba(241,245,249,0.9) 0%,transparent 100%)"}}/>
      </div>

      {/* Patient image or placeholder */}
      {patientImg
        ?<div style={{position:"absolute",inset:0,zIndex:1}}><img src={patientImg} alt="Patient" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.06) 0%,rgba(0,0,0,0) 40%,rgba(0,0,0,0.15) 100%)"}}/></div>
        :<div style={{position:"absolute",inset:0,zIndex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,background:"rgba(255,255,255,0.6)",backdropFilter:"blur(20px)",borderRadius:20,padding:"36px 40px",border:"1px solid rgba(255,255,255,0.8)",boxShadow:"0 8px 32px rgba(0,0,0,0.06)"}}><div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#dbeafe,#eff6ff)",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid rgba(59,130,246,0.15)"}}><User size={28} color="#93c5fd"/></div><span style={{color:"#64748b",fontSize:13,fontWeight:600}}>No patient image loaded</span><button onClick={function(){fileRef.current&&fileRef.current.click();}} style={{background:"#7B6FA8",color:"white",border:"none",borderRadius:10,padding:"9px 22px",fontSize:12,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(37,99,235,0.25)",transition:"all 0.2s"}} onMouseOver={function(e){e.currentTarget.style.background="#7B6FA8";e.currentTarget.style.boxShadow="0 4px 12px rgba(37,99,235,0.35)";}} onMouseOut={function(e){e.currentTarget.style.background="#7B6FA8";e.currentTarget.style.boxShadow="0 2px 8px rgba(37,99,235,0.25)";}}>Load Patient Image</button></div></div>}

      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={loadFile(setPatientImg)}/>
      <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={loadFile(setLogoSrc)}/>

      {/* Logo + Menu - top left above sidebar */}
      <div style={{position:"absolute",top:16,left:16,zIndex:30,width:210,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderRadius:12,padding:"12px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04)",border:"1px solid rgba(226,232,240,0.8)",display:"flex",alignItems:"center",gap:10,boxSizing:"border-box"}}>
        <button onClick={function(){setMenu(true);setMenuPage(null);}} style={{width:28,height:28,borderRadius:7,border:menu?"none":"1px solid #e2e8f0",background:menu?"#7B6FA8":"#f1f5f9",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0}} onMouseOver={function(e){if(!menu)e.currentTarget.style.background="#e2e8f0";}} onMouseOut={function(e){if(!menu)e.currentTarget.style.background="#f1f5f9";}}><Menu size={14} color={menu?"white":"#64748b"}/></button>
        <div style={{width:1,height:24,background:"#e2e8f0",flexShrink:0}}/>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="i-Human Patients by Kaplan" style={{height:28,objectFit:"contain",flex:1,minWidth:0}}/>
      </div>

      {/* Sidebar */}
      <div style={{position:"absolute",top:82,left:16,zIndex:25,width:sidebarW,maxHeight:"calc(100vh - 100px)",background:"rgba(255,255,255,0.95)",backdropFilter:"blur(16px)",border:"1px solid rgba(226,232,240,0.8)",borderRadius:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04)",transition:"width .25s ease",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Sidebar header */}
        <div style={{flexShrink:0,borderBottom:"1px solid #e2e8f0"}}>
          <div style={{padding:sidebarOpen?"16px 18px 28px":"14px 8px 12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:sidebarOpen?"flex-end":"center",marginBottom:sidebarOpen?10:0}}>
              {sidebarOpen&&<button onClick={function(){setSidebarOpen(function(prev){return !prev;});}} style={{padding:5,borderRadius:6,border:"none",background:"#f1f5f9",border:"1px solid #e2e8f0",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.15s"}} onMouseOver={function(e){e.currentTarget.style.background="#e2e8f0";}} onMouseOut={function(e){e.currentTarget.style.background="#f1f5f9";}}><ChevronLeft size={14} color="#64748b"/></button>}
            </div>
            {sidebarOpen&&<div style={{marginTop:2}}>
              <p style={{margin:"0 0 10px",fontWeight:700,fontSize:13,color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:"-0.01em"}}>Marvin Webster</p>
              <span style={{fontSize:9,fontWeight:700,color:"#7FB67B",background:"#e8f5e6",padding:"3px 10px",borderRadius:999,textTransform:"uppercase",letterSpacing:"0.05em"}}>Learning Mode</span>
            </div>}
            {!sidebarOpen&&<button onClick={function(){setSidebarOpen(true);}} style={{padding:5,borderRadius:6,border:"none",background:"#f1f5f9",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:6,transition:"background 0.15s"}} onMouseOver={function(e){e.currentTarget.style.background="#e2e8f0";}} onMouseOut={function(e){e.currentTarget.style.background="#f1f5f9";}}><ChevronRight size={14} color="#94a3b8"/></button>}
          </div>
        </div>
        {/* Step list */}
        <div style={{overflowY:"auto",padding:"16px 0 12px"}}>
          {STEPS.map(function(step,i){
            var done=i<activeStep,cur=i===viewStep;
            return <div key={step.label}>
              <div style={{display:"flex",flexDirection:"column",alignItems:sidebarOpen?"flex-start":"center",padding:sidebarOpen?"0 18px":"0 8px",marginBottom:step.subs.length>0&&sidebarOpen&&cur?4:4}}>
                <div style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"4px 0",cursor:"pointer",borderRadius:8}} onClick={function(){setViewStep(i);setViewSub(null);}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:10,background:done?"#e8f5e6":cur?"#7FB67B":"#f1f5f9",color:done?"#7FB67B":cur?"white":"#cbd5e1",border:done?"1.5px solid #c8e6c6":cur?"none":"1.5px solid #e2e8f0",boxShadow:cur?"0 0 0 3px rgba(127,182,123,0.2)":"none",transition:"all 0.2s"}}>{done?<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#7FB67B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>:i+1}</div>
                  {sidebarOpen&&<span style={{fontSize:12,fontWeight:cur?600:done?500:400,color:cur?"#1e293b":done?"#475569":"#94a3b8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,transition:"color 0.15s",letterSpacing:"-0.01em"}}>{step.label}</span>}
                </div>
                {i<STEPS.length-1&&!(step.subs.length>0&&sidebarOpen&&cur)&&<div style={{width:1.5,height:16,marginLeft:13,background:done?"#c8e6c6":"#e2e8f0",borderRadius:1}}/>}
              </div>
              {sidebarOpen&&cur&&step.subs.length>0&&<div style={{marginLeft:28,marginBottom:6,paddingLeft:2}}>
                {step.subs.map(function(sub){var isActive=viewSub===sub;return <div key={sub} onClick={function(){setViewStep(i);setViewSub(sub);}} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px 4px 0",position:"relative",cursor:"pointer",background:isActive?"#f0fdf4":"transparent",borderRadius:6,marginLeft:-4,paddingLeft:4,transition:"background 0.15s"}} onMouseOver={function(e){if(!isActive)e.currentTarget.style.background="#f8fafc";e.currentTarget.querySelector("span").style.color="#1e293b";}} onMouseOut={function(e){if(!isActive)e.currentTarget.style.background="transparent";e.currentTarget.querySelector("span").style.color=isActive?"#2d6a2e":"#64748b";}}><div style={{position:"absolute",left:7,top:0,bottom:0,width:1.5,background:"#e2e8f0"}}/><div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:isActive?"#7FB67B":"#e8f5e6",border:isActive?"1.5px solid #7FB67B":"1.5px solid #c8e6c6",zIndex:1,transition:"all 0.15s"}}/><span style={{fontSize:10,color:isActive?"#2d6a2e":"#64748b",fontWeight:isActive?600:400,lineHeight:1.4,flex:1,transition:"color 0.15s"}}>{sub}</span></div>;})}
                <div style={{width:1.5,height:16,marginLeft:3,background:"#e2e8f0",borderRadius:1}}/>
              </div>}
            </div>;
          })}
        </div>
      </div>

      {/* Chat panel - draggable, centered */}
      {ready&&showChat&&<div style={{position:"absolute",zIndex:35,left:chat.pos.x,top:chat.pos.y,width:chat.size.w,height:chat.size.h,display:"flex",flexDirection:"column",borderRadius:16,overflow:"hidden",background:"rgba(255,255,255,0.97)",backdropFilter:"blur(16px)",border:"1px solid rgba(226,232,240,0.8)",boxShadow:"0 12px 40px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.06)"}}>
        <div onMouseDown={chat.onDrag} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid #f1f5f9",background:"rgba(249,250,251,0.97)",flexShrink:0,cursor:"move",userSelect:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><MessageSquare size={14} color="#7B6FA8"/><span style={{color:"#334155",fontWeight:600,fontSize:12}}>Patient Interview</span><span style={{color:"#94a3b8",fontSize:10,fontWeight:500}}>{qCount} asked</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>{msgs.length>0&&<button onClick={function(e){e.stopPropagation();setMsgs([]);}} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:10}}>Clear</button>}<button onClick={function(e){e.stopPropagation();setShowChat(false);if(synth.current)synth.current.cancel();}} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",display:"flex"}}><X size={14}/></button></div>
        </div>
        <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
          {msgs.length===0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",textAlign:"center",gap:10}}><p style={{color:"#9ca3af",fontSize:11}}>Start by greeting the patient</p><div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6}}>{["How can I help you today?","What happened?","What is your name?"].map(function(q){return <button key={q} onClick={function(){ask(q);}} style={{background:"#eff6ff",color:"#7B6FA8",border:"1px solid #dbeafe",borderRadius:999,padding:"4px 12px",fontSize:11,cursor:"pointer"}}>{q}</button>;})}</div></div>}
          {msgs.map(function(m,i){var isU=m.role==="user";return <div key={i} style={{display:"flex",alignItems:"flex-end",gap:6,flexDirection:isU?"row-reverse":"row"}}><div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:9,color:"white",background:isU?"#7B6FA8":"#f59e0b"}}>{isU?"Dr":"M"}</div><div style={{display:"flex",flexDirection:"column",gap:2,maxWidth:"70%",alignItems:isU?"flex-end":"flex-start"}}><span style={{color:"#9ca3af",fontSize:10,paddingLeft:4}}>{isU?"You":"Marvin"} · {m.t}</span><div style={{borderRadius:16,padding:"8px 12px",lineHeight:1.5,fontSize:12,borderBottomRightRadius:isU?4:undefined,borderBottomLeftRadius:!isU?4:undefined,background:isU?"#7B6FA8":"#f3f4f6",color:isU?"white":"#1f2937",border:isU?"none":"1px solid #e5e7eb"}}>{m.text}</div></div></div>;})}
          {loading&&<div style={{display:"flex",alignItems:"flex-end",gap:6}}><div style={{width:24,height:24,borderRadius:"50%",background:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"white"}}>M</div><div style={{background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:16,borderBottomLeftRadius:4,padding:"10px 14px",display:"flex",gap:4,alignItems:"center"}}>{[0,150,300].map(function(d){return <span key={d} style={{width:6,height:6,borderRadius:"50%",background:"#9ca3af",display:"inline-block",animation:"bounce 1s infinite",animationDelay:d+"ms"}}/>;})}</div></div>}
        </div>
        <div style={{borderTop:"1px solid #f3f4f6",padding:"10px 12px",background:"rgba(255,255,255,0.97)",flexShrink:0}}><div style={{display:"flex",alignItems:"center",gap:8,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:12,padding:"6px 12px"}}><button style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",display:"flex"}}><Mic size={14}/></button><input ref={inputRef} style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:12,color:"#1f2937"}} placeholder="Ask Marvin a question…" value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")ask();}}/><button onClick={function(){ask();}} disabled={!input.trim()||loading} style={{background:input.trim()&&!loading?"#7B6FA8":"#e5e7eb",border:"none",borderRadius:8,padding:"5px 8px",cursor:input.trim()&&!loading?"pointer":"not-allowed",display:"flex"}}><Send size={12} color={input.trim()&&!loading?"white":"#9ca3af"}/></button></div></div>
        <Grip onMouseDown={chat.onResize}/>
      </div>}

      {/* Observations panel */}
      {showObs&&<div style={{position:"fixed",zIndex:50,left:obsP.pos.x,top:obsP.pos.y,width:obsP.size.w,height:obsP.size.h,display:"flex",flexDirection:"column",background:"white",borderRadius:16,boxShadow:"0 12px 40px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden",border:"1px solid rgba(226,232,240,0.8)"}}>
        <div onMouseDown={obsP.onDrag} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"#7B6FA8",color:"white",flexShrink:0,cursor:"move",userSelect:"none"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Eye color="white"/><span style={{fontWeight:700,fontSize:12}}>Observations</span></div><button onClick={function(){setShowObs(false);}} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",display:"flex",padding:3,borderRadius:4}}><X size={14}/></button></div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}><p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>General</p><p style={{margin:0,fontSize:12,color:"#334155",lineHeight:1.7}}><span style={{fontWeight:600,color:"#7B6FA8"}}>Skin:</span> In no distress, not diaphoretic, not flushed.</p></div>
        <Grip onMouseDown={obsP.onResize}/>
      </div>}

      {/* EHR panel */}
      {showEHR&&<div style={{position:"fixed",zIndex:50,left:ehr.pos.x,top:ehr.pos.y,width:ehr.size.w,height:ehr.size.h,display:"flex",flexDirection:"column",background:"white",borderRadius:16,boxShadow:"0 25px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <div style={{display:"flex",overflow:"hidden",flex:1,minHeight:0}}>
          <div style={{width:175,background:"#f8f9fa",borderRight:"1px solid #e9ecef",flexShrink:0,display:"flex",flexDirection:"column"}}>
            <div onMouseDown={ehr.onDrag} style={{padding:"12px 14px",background:"#7B6FA8",color:"white",flexShrink:0,cursor:"move",userSelect:"none"}}><Dots/><p style={{fontWeight:700,fontSize:13,margin:0}}>EHR</p><p style={{color:"#93c5fd",fontSize:10,margin:"2px 0 0"}}>Marvin Webster, 34M</p></div>
            <div style={{flex:1,overflowY:"auto"}}>{EHR_TABS.map(function(t){return <button key={t} onClick={function(){setEhrTab(t);}} style={{textAlign:"left",padding:"10px 14px",fontWeight:500,fontSize:11,cursor:"pointer",background:ehrTab===t?"#eff6ff":"none",color:ehrTab===t?"#7B6FA8":"#4b5563",borderLeft:ehrTab===t?"3px solid #2563eb":"3px solid transparent",width:"100%",border:"none",borderBottom:"1px solid #f0f0f0",lineHeight:1.4}}>{t}</button>;})}</div>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}><h2 style={{fontWeight:700,color:"#1f2937",fontSize:14,margin:0}}>{ehrTab}</h2><button onClick={function(){setShowEHR(false);}} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af"}}><X size={18}/></button></div>
            <div style={{flex:1,overflowY:"auto",padding:20,fontSize:12}}><EHRSection {...ehrProps}/></div>
          </div>
        </div>
        <Grip onMouseDown={ehr.onResize}/>
      </div>}

      {/* Physical Exams panel */}
      {showExams&&<div style={{position:"fixed",zIndex:50,left:examP.pos.x,top:examP.pos.y,width:examP.size.w,height:examP.size.h,display:"flex",flexDirection:"column",background:"white",borderRadius:16,boxShadow:"0 25px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <PanelHdr onDrag={examP.onDrag} bg="#7B6FA8" icon={<ExamIco/>} title="Physical Exams" onClose={function(){setShowExams(false);setSelExam(null);setExamSearch("");}}/>
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{width:200,borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
            <div style={{padding:"10px 12px",borderBottom:"1px solid #f3f4f6"}}><div style={{display:"flex",alignItems:"center",gap:6,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 10px"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input value={examSearch} onChange={function(e){setExamSearch(e.target.value);}} placeholder="Search exams…" style={{border:"none",outline:"none",background:"transparent",fontSize:11,color:"#1f2937",flex:1}}/></div></div>
            <div style={{flex:1,overflowY:"auto"}}>{filteredExams.length===0?<p style={{color:"#d1d5db",fontStyle:"italic",textAlign:"center",padding:"24px 8px",fontSize:11}}>No exams found</p>:filteredExams.map(function(e){return <button key={e.id} onClick={function(){setSelExam(e);}} style={{width:"100%",textAlign:"left",padding:"10px 14px",border:"none",borderBottom:"1px solid #f3f4f6",cursor:"pointer",background:selExam&&selExam.id===e.id?"#fff7ed":"white",borderLeft:selExam&&selExam.id===e.id?"3px solid #ea580c":"3px solid transparent"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{e.icon}</span><div><p style={{margin:0,fontSize:12,fontWeight:selExam&&selExam.id===e.id?700:500,color:selExam&&selExam.id===e.id?"#7B6FA8":"#1f2937"}}>{e.name}</p><p style={{margin:0,fontSize:10,color:"#9ca3af"}}>{e.cat}</p></div></div></button>;})}</div>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>{selExam?<><div style={{padding:"12px 18px",borderBottom:"1px solid #e5e7eb",background:"#fff7ed",flexShrink:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:22}}>{selExam.icon}</span><div><p style={{margin:0,fontWeight:700,fontSize:13,color:"#7B6FA8"}}>{selExam.name}</p><p style={{margin:0,fontSize:10,color:"#9ca3af"}}>{selExam.cat}</p></div></div></div><div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>{selExam.findings.length>0?<><p style={{fontWeight:700,fontSize:11,color:"#6b7280",textTransform:"uppercase",margin:"0 0 10px"}}>Findings</p><ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:8}}>{selExam.findings.map(function(f,i){return <li key={i} style={{fontSize:12,color:"#1f2937",lineHeight:1.6}}>{f}</li>;})}</ul></>:<p style={{color:"#9ca3af",textAlign:"center",marginTop:40,fontSize:12}}>No findings available yet.</p>}</div></>:<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10,color:"#9ca3af",padding:24}}><ExamIco color="#e5e7eb"/><p style={{fontSize:12,margin:0}}>Select an exam to view findings.</p></div>}</div>
        </div>
        <Grip onMouseDown={examP.onResize}/>
      </div>}

      {/* Exercises panel */}
      {showEx&&<ExercisePanel drag={exP} onClose={function(){setShowEx(false);}}/>}

      {/* Guidance panel */}
      {showGuid&&<div style={{position:"fixed",zIndex:50,left:guid.pos.x,top:guid.pos.y,width:guid.size.w,height:guid.size.h,display:"flex",flexDirection:"column",background:"white",borderRadius:16,boxShadow:"0 25px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <PanelHdr onDrag={guid.onDrag} bg="#7B6FA8" icon={<BookOpen size={15} color="white"/>} title="History Guidance & Feedback" onClose={function(){setShowGuid(false);}}/>
        <div style={{display:"flex",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>{[["guidance","History Guidance"],["feedback","History Feedback"]].map(function(item){return <button key={item[0]} onClick={function(){setGuidTab(item[0]);}} style={{flex:1,padding:10,fontWeight:600,fontSize:12,background:"none",border:"none",borderBottom:guidTab===item[0]?"2px solid #0f766e":"2px solid transparent",color:guidTab===item[0]?"#7B6FA8":"#9ca3af",cursor:"pointer"}}>{item[1]}</button>;})}</div>
        <div style={{flex:1,overflowY:"auto",padding:20,fontSize:12}}>
          {guidTab==="guidance"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>{GUIDANCE_ITEMS.map(function(item,i){return <div key={i} style={{background:"#f0fdf9",border:"1px solid #ccfbef",borderRadius:12,padding:"14px 16px"}}><p style={{fontWeight:700,color:"#7B6FA8",fontSize:13,margin:"0 0 6px"}}>{item.title}</p>{item.body&&<p style={{color:"#374151",lineHeight:1.7,margin:0}}>{item.body}</p>}{item.bullets&&<ul style={{margin:"6px 0 0",paddingLeft:18,color:"#374151",lineHeight:1.7}}>{item.bullets.map(function(b,j){return <li key={j}>{b}</li>;})}</ul>}</div>;})}</div>}
          {guidTab==="feedback"&&<div><p style={{color:"#6b7280",marginBottom:16}}>Strategy for selecting required questions using the OLD-CARTS mnemonic.</p><div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}><div style={{display:"grid",gridTemplateColumns:"72px 1fr 1fr",background:"#f8f9fa",borderBottom:"1px solid #e5e7eb",padding:"8px 12px",gap:8}}>{["Graded","Question","Response"].map(function(h){return <span key={h} style={{fontWeight:700,color:"#374151",fontSize:10,textTransform:"uppercase"}}>{h}</span>;})}</div>{FB_ROWS.map(function(row,ri){return <div key={ri} style={{display:"grid",gridTemplateColumns:"72px 1fr 1fr",padding:"10px 12px",gap:8,borderBottom:ri<FB_ROWS.length-1?"1px solid #f3f4f6":"none",background:ri%2===0?"white":"#fafafa"}}><span style={{background:"#ede9f6",color:"#478843",fontWeight:700,fontSize:10,padding:"2px 8px",borderRadius:999,width:"fit-content"}}>{row.grade}</span><span style={{color:"#1f2937",fontSize:12}}>{row.q}</span><span style={{color:"#6b7280",fontStyle:"italic",fontSize:12}}>{row.r}</span></div>;})}</div></div>}
        </div>
        <Grip onMouseDown={guid.onResize}/>
      </div>}

      {/* Case Info panel */}
      {showInfo&&<div style={{position:"fixed",zIndex:50,left:infoP.pos.x,top:infoP.pos.y,width:infoP.size.w,height:infoP.size.h,display:"flex",flexDirection:"column",background:"white",borderRadius:16,boxShadow:"0 25px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <PanelHdr onDrag={infoP.onDrag} bg="#7B6FA8" icon={<Info size={14} color="white"/>} title="Case Instructions" onClose={function(){setShowInfo(false);}}/>
        <div style={{flex:1,overflowY:"auto",padding:24,fontSize:13,lineHeight:1.8,color:"#1f2937"}}><p style={{margin:"0 0 10px",fontWeight:600}}>i-Human Graduate Premium Sick Visit Cases.</p><p style={{margin:0,color:"#6b7280"}}>Learn more about how to play this case.</p></div>
        <Grip onMouseDown={infoP.onResize}/>
      </div>}

      {/* Toolbar column */}
      <div style={{position:"absolute",right:16,top:16,zIndex:30,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:12}}>

        {/* Tools toolbar (Panels + Navigate merged) */}
        <div style={{width:130,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(16px)",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04)",border:"1px solid rgba(226,232,240,0.8)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"6px 10px 4px",borderBottom:"1px solid #f1f5f9"}}><span style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>Tools</span></div>
          <div style={{display:"flex",flexDirection:"column",padding:4,gap:2}}>
            <button onClick={function(){setShowObs(function(prev){return !prev;});}} title={showObs?"Hide Observations":"Show Observations"} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:"none",background:showObs?"#ede9f6":"none",cursor:"pointer",borderRadius:8,color:showObs?"#7B6FA8":"#475569",fontSize:11,fontWeight:showObs?600:500,transition:"background 0.15s"}} onMouseOver={function(e){if(!showObs)e.currentTarget.style.background="#f1f5f9";}} onMouseOut={function(e){if(!showObs)e.currentTarget.style.background="none";}}><div style={{width:28,height:28,borderRadius:7,background:showObs?"#7B6FA8":"#f1f5f9",border:showObs?"none":"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Eye color={showObs?"white":"#64748b"}/></div>Observations</button>
            <button onClick={function(){setShowEHR(true);}} title="EHR" style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:"none",background:showEHR?"#ede9f6":"none",cursor:"pointer",borderRadius:8,color:showEHR?"#7B6FA8":"#475569",fontSize:11,fontWeight:showEHR?600:500,transition:"background 0.15s"}} onMouseOver={function(e){if(!showEHR)e.currentTarget.style.background="#f1f5f9";}} onMouseOut={function(e){if(!showEHR)e.currentTarget.style.background="none";}}><div style={{width:28,height:28,borderRadius:7,background:showEHR?"#7B6FA8":"#f1f5f9",border:showEHR?"none":"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ClipboardList size={14} color={showEHR?"white":"#64748b"}/></div>EHR</button>
            {(function(){var canExam=viewStep>=2&&viewStep<=5;return <button onClick={function(){if(canExam)setShowExams(true);}} title={canExam?"Exams":"Available in Assessment, Test Results, Diagnosis & Orders"} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:"none",background:showExams?"#ede9f6":"none",cursor:canExam?"pointer":"not-allowed",borderRadius:8,color:showExams?"#7B6FA8":canExam?"#475569":"#cbd5e1",fontSize:11,fontWeight:showExams?600:500,opacity:canExam?1:0.9,transition:"background 0.15s"}} onMouseOver={function(e){if(canExam&&!showExams)e.currentTarget.style.background="#f1f5f9";}} onMouseOut={function(e){if(canExam&&!showExams)e.currentTarget.style.background="none";}}><div style={{width:28,height:28,borderRadius:7,background:showExams?"#7B6FA8":canExam?"#f1f5f9":"#f8fafc",border:showExams?"none":"1px solid "+(canExam?"#e2e8f0":"#f1f5f9"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ExamIco color={showExams?"white":canExam?"#64748b":"#cbd5e1"}/></div>Exams</button>;})()}
            {(function(){var canEx=viewStep>=2&&viewStep<=5;return <button onClick={function(){if(canEx)setShowEx(true);}} title={canEx?"Exercises":"Available in Assessment, Test Results, Diagnosis & Orders"} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:"none",background:showEx?"#ede9f6":"none",cursor:canEx?"pointer":"not-allowed",borderRadius:8,color:showEx?"#7B6FA8":canEx?"#475569":"#cbd5e1",fontSize:11,fontWeight:showEx?600:500,opacity:canEx?1:0.9,transition:"background 0.15s"}} onMouseOver={function(e){if(canEx&&!showEx)e.currentTarget.style.background="#f1f5f9";}} onMouseOut={function(e){if(canEx&&!showEx)e.currentTarget.style.background="none";}}><div style={{width:28,height:28,borderRadius:7,background:showEx?"#7B6FA8":canEx?"#f1f5f9":"#f8fafc",border:showEx?"none":"1px solid "+(canEx?"#e2e8f0":"#f1f5f9"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><PenIco color={showEx?"white":canEx?"#64748b":"#cbd5e1"}/></div>Exercises</button>;})()}
            <div style={{height:1,background:"#f1f5f9",margin:"2px 10px"}}/>
            <button onClick={function(){setShowInfo(true);}} title="Case Instructions" style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:"none",background:showInfo?"#ede9f6":"none",cursor:"pointer",borderRadius:8,color:showInfo?"#7B6FA8":"#475569",fontSize:11,fontWeight:showInfo?600:500,transition:"background 0.15s"}} onMouseOver={function(e){if(!showInfo)e.currentTarget.style.background="#f1f5f9";}} onMouseOut={function(e){if(!showInfo)e.currentTarget.style.background="none";}}><div style={{width:28,height:28,borderRadius:7,background:showInfo?"#7B6FA8":"#f1f5f9",border:showInfo?"none":"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Info size={14} color={showInfo?"white":"#64748b"}/></div>Case Info</button>
            <button onClick={function(){setShowGuid(true);}} title="History Guidance" style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:"none",background:showGuid?"#ede9f6":"none",cursor:"pointer",borderRadius:8,color:showGuid?"#7B6FA8":"#475569",fontSize:11,fontWeight:showGuid?600:500,transition:"background 0.15s"}} onMouseOver={function(e){if(!showGuid)e.currentTarget.style.background="#f1f5f9";}} onMouseOut={function(e){if(!showGuid)e.currentTarget.style.background="none";}}><div style={{width:28,height:28,borderRadius:7,background:showGuid?"#7B6FA8":"#f1f5f9",border:showGuid?"none":"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><BookOpen size={13} color={showGuid?"white":"#64748b"}/></div>Guidance</button>
            <div style={{height:1,background:"#f1f5f9",margin:"2px 10px"}}/>
            <button onClick={toggleSound} title="Sound" style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:"none",background:"none",cursor:"pointer",borderRadius:8,color:"#475569",fontSize:11,fontWeight:500,transition:"background 0.15s"}} onMouseOver={function(e){e.currentTarget.style.background="#f1f5f9";}} onMouseOut={function(e){e.currentTarget.style.background="none";}}><div style={{width:28,height:28,borderRadius:7,background:"#f1f5f9",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{soundOn?<Volume2 size={14} color="#64748b"/>:<VolumeX size={14} color="#94a3b8"/>}</div>{soundOn?"Sound On":"Muted"}</button>
          </div>
        </div>


      </div>

      {/* Collapsed chat input bar - bottom right (shown when chat is closed) */}
      {ready&&!showChat&&<div style={{position:"absolute",right:16,bottom:62,zIndex:30,width:340}}>
        <div onClick={function(){setShowChat(true);}} style={{background:"rgba(255,255,255,0.97)",backdropFilter:"blur(16px)",border:"1px solid rgba(226,232,240,0.8)",borderRadius:16,boxShadow:"0 12px 40px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden",cursor:"pointer",transition:"box-shadow 0.2s"}} onMouseOver={function(e){e.currentTarget.style.boxShadow="0 14px 44px rgba(0,0,0,0.18),0 3px 10px rgba(0,0,0,0.08)";}} onMouseOut={function(e){e.currentTarget.style.boxShadow="0 12px 40px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.06)";}}>
          <div style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:12,padding:"8px 12px"}}><Mic size={14} color="#9ca3af"/><span style={{flex:1,fontSize:12,color:"#9ca3af"}}>Ask Marvin a question…</span><Send size={12} color="#9ca3af"/></div></div>
        </div>
      </div>}

      {/* Menu floating panel */}
      {menu&&<><div style={{position:"fixed",inset:0,zIndex:49}} onClick={function(){setMenu(false);setMenuPage(null);}}/><div style={{position:"fixed",zIndex:50,left:menuP.pos.x,top:menuP.pos.y,width:menuP.size.w,display:"flex",flexDirection:"column",background:"rgba(255,255,255,0.97)",backdropFilter:"blur(16px)",borderRadius:16,boxShadow:"0 12px 40px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.06)",border:"1px solid rgba(226,232,240,0.8)",overflow:"hidden"}}>
        <div onMouseDown={menuP.onDrag} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#7B6FA8",color:"white",cursor:"move",userSelect:"none",flexShrink:0}}><span style={{fontWeight:600,fontSize:13}}>Menu</span><button onClick={function(){setMenu(false);setMenuPage(null);}} style={{background:"none",border:"none",cursor:"pointer",color:"white",display:"flex"}}><X size={16}/></button></div>
        <div style={{overflowY:"auto",maxHeight:400}}><MenuContent/></div>
      </div></>}

      {/* Proceed modal */}
      {showProc&&<div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)"}}><div style={{background:"white",borderRadius:16,boxShadow:"0 25px 60px rgba(0,0,0,0.3)",padding:28,width:320}}><h3 style={{fontWeight:700,color:"#111827",fontSize:15,margin:"0 0 12px"}}>Submit this section and move to the next?</h3><p style={{color:"#6b7280",fontSize:12,lineHeight:1.6,marginBottom:20}}>This will complete <strong>{STEPS[activeStep].label}</strong> and advance to <strong>{STEPS[Math.min(activeStep+1,STEPS.length-1)].label}</strong>.</p><div style={{display:"flex",gap:10}}><button onClick={function(){setShowProc(false);}} style={{flex:1,border:"1px solid #e5e7eb",background:"white",color:"#374151",padding:10,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>No</button><button onClick={function(){var next=Math.min(activeStep+1,STEPS.length-1);setActiveStep(next);setViewStep(next);setShowProc(false);}} style={{flex:1,background:"#7B6FA8",border:"none",color:"white",padding:10,borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>Yes</button></div></div></div>}

      {/* Proceed button - bottom left */}
      <div style={{position:"absolute",bottom:62,left:16,zIndex:30}}>
        <button onClick={function(){setShowProc(true);}} title="Proceed to next section" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"0 16px",height:54,border:"none",background:"#559E4F",cursor:"pointer",borderRadius:12,color:"white",fontSize:12,fontWeight:600,width:210,boxSizing:"border-box",boxShadow:"0 4px 20px rgba(85,158,79,0.3),0 1px 3px rgba(0,0,0,0.06)",transition:"all 0.2s"}} onMouseOver={function(e){e.currentTarget.style.background="#4a8c44";e.currentTarget.style.boxShadow="0 6px 24px rgba(127,182,123,0.4),0 2px 4px rgba(0,0,0,0.08)";}} onMouseOut={function(e){e.currentTarget.style.background="#559E4F";e.currentTarget.style.boxShadow="0 4px 20px rgba(85,158,79,0.3),0 1px 3px rgba(0,0,0,0.06)";}}>Proceed to Next Section<ArrowRightCircle size={15} color="white"/></button>
      </div>

      {/* Footer */}
      <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",zIndex:20,textAlign:"center",padding:"4px 16px"}}>
        <span style={{color:"rgba(255,255,255,0.7)",fontSize:10,textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>Copyright 2015-2026 i-Human Patients, a part of Kaplan, Inc. All rights reserved.</span>
      </div>

      <style>{"@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}"}</style>
    </div>
  );
}
