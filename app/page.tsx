"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, BookOpen, ChevronLeft, ChevronRight, Download, LockKeyhole,
  PanelLeftClose, PanelRightClose, Plus, RotateCcw, Search, ShieldCheck,
  Upload, Users, X,
} from "lucide-react";

export type Person = {
  id: string; name: string; years: string; relation: string; initials: string;
  color: string; bio: string; education: string; work: string;
  moments: string[]; sources: string[]; parents: string[];
  linkedTo?: string; linkType?: string;
};
type FamilyData = { version: number; updatedAt: string; familyName: string; people: Person[] };

const FALLBACK: FamilyData = { version: 1, updatedAt: "2026-09-02", familyName: "Берзиньш — Озолс", people: [] };
const STORAGE_KEY = "family-archive-local-v2";

export default function Home() {
  const [data, setData] = useState<FamilyData>(FALLBACK);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [localDirty, setLocalDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/family.json`, { cache: "no-store" }).then(r => r.ok ? r.json() : FALLBACK).catch(() => FALLBACK),
      Promise.resolve(localStorage.getItem(STORAGE_KEY)),
    ]).then(([published, saved]) => {
      const local = saved ? JSON.parse(saved) : null;
      const next = local?.dirty ? local.data : published;
      setData(next);
      setLocalDirty(Boolean(local?.dirty));
      setSelected(next.people[0]?.id || "");
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready && localDirty) localStorage.setItem(STORAGE_KEY, JSON.stringify({ dirty: true, data }));
  }, [data, localDirty, ready]);

  const person = data.people.find(p => p.id === selected) || data.people[0];
  const shown = useMemo(() => data.people.filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [data.people, query]);
  const core = (id: string) => data.people.find(p => p.id === id);

  function updatePeople(people: Person[]) {
    setData(v => ({ ...v, updatedAt: new Date().toISOString().slice(0, 10), people }));
    setLocalDirty(true);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "family.json"; a.click(); URL.revokeObjectURL(a.href);
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result)) as FamilyData;
        if (!Array.isArray(next.people)) throw new Error();
        if (confirm("Заменить локальные данные содержимым файла?")) {
          setData(next); setSelected(next.people[0]?.id || ""); setLocalDirty(true);
        }
      } catch { alert("Файл не соответствует формату семейного архива."); }
    };
    reader.readAsText(file);
  }

  async function resetPublished() {
    if (!confirm("Удалить локальные изменения и загрузить опубликованный family.json?")) return;
    const published = await fetch(`${import.meta.env.BASE_URL}data/family.json?t=${Date.now()}`).then(r => r.json());
    localStorage.removeItem(STORAGE_KEY); setData(published); setLocalDirty(false); setSelected(published.people[0]?.id || "");
  }

  function addPerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget), name = String(fd.get("name") || "").trim();
    if (!name) return;
    const id = crypto.randomUUID(), linkType = String(fd.get("linkType") || "relative");
    const created: Person = {
      id, name, years: String(fd.get("years") || ""), relation: String(fd.get("relation") || "родственник"),
      initials: name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase(), color: "#6a5d4d",
      bio: String(fd.get("bio") || ""), education: "", work: "", moments: [], sources: [], parents: [],
      linkedTo: addingTo || undefined, linkType,
    };
    updatePeople([...data.people, created]); setSelected(id); setAddingTo(null); setRightOpen(true);
  }

  return <main className="app-shell">
    <header>
      <div className="brand"><span className="brand-mark"><Archive size={20}/></span><div><b>Семейный архив</b><small>Древо семьи {data.familyName}</small></div></div>
      <div className="header-actions">
        <span className="local-badge"><ShieldCheck size={15}/> {localDirty ? "Есть локальные изменения" : "Опубликованные данные"}</span>
        {localDirty && <button className="icon-button" onClick={resetPublished} title="Вернуть опубликованные данные"><RotateCcw size={18}/></button>}
        <button className="icon-button" onClick={() => fileRef.current?.click()} title="Импортировать"><Upload size={18}/></button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={importData}/>
        <button className="secondary" onClick={exportData}><Download size={17}/> Резервная копия</button>
        <button className="primary" onClick={() => setAddingTo(selected || "new")}><Plus size={18}/> Добавить человека</button>
      </div>
    </header>

    <section className={`workspace ${leftOpen ? "" : "left-collapsed"} ${rightOpen ? "" : "right-collapsed"}`}>
      <aside className="people-panel">
        <button className="panel-toggle left" onClick={() => setLeftOpen(v => !v)} title={leftOpen ? "Свернуть список" : "Открыть список"}>{leftOpen ? <PanelLeftClose/> : <ChevronRight/>}</button>
        <div className="panel-content">
          <div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти родственника"/></div>
          <div className="aside-title"><span>Люди</span><span>{shown.length}</span></div>
          <div className="people-list">{shown.map(p => <button key={p.id} className={selected === p.id ? "person-row active" : "person-row"} onClick={() => { setSelected(p.id); setRightOpen(true); }}><Avatar p={p}/><span><b>{p.name}</b><small>{p.relation} · {p.years}</small></span></button>)}</div>
          <div className="privacy-note"><LockKeyhole size={18}/><div><b>Локальный режим</b><p>Изменения сохраняются в этом браузере. Для публикации скачайте family.json и замените файл в GitHub.</p></div></div>
        </div>
      </aside>

      <section className="canvas">
        <div className="canvas-head"><div><small>СЕМЕЙНОЕ ДРЕВО</small><h1>{data.people.length} историй, одна семья</h1></div><div className="legend"><span><i/> Родственная связь</span></div></div>
        <div className="tree">
          <div className="generation"><TreeCard p={core("anna")} active={selected} select={setSelected} add={setAddingTo}/><TreeCard p={core("janis")} active={selected} select={setSelected} add={setAddingTo}/></div>
          <div className="line"/>
          <div className="generation"><TreeCard p={core("ilona")} active={selected} select={setSelected} add={setAddingTo}/><TreeCard p={core("maris")} active={selected} select={setSelected} add={setAddingTo}/></div>
          <div className="line short"/>
          <div className="generation"><TreeCard p={core("roman")} active={selected} select={setSelected} add={setAddingTo}/></div>
          {data.people.filter(p => !["anna","janis","ilona","maris","roman"].includes(p.id)).length > 0 && <div className="extra-grid">{data.people.filter(p => !["anna","janis","ilona","maris","roman"].includes(p.id)).map(p => <TreeCard key={p.id} p={p} active={selected} select={setSelected} add={setAddingTo}/>)}</div>}
        </div>
      </section>

      <aside className="details">
        <button className="panel-toggle right" onClick={() => setRightOpen(v => !v)} title={rightOpen ? "Свернуть карточку" : "Открыть карточку"}>{rightOpen ? <PanelRightClose/> : <ChevronLeft/>}</button>
        <div className="panel-content">{person && <><div className="details-top"><Avatar p={person} large/><span className="status">Проверено семьёй</span></div><p className="eyebrow">{person.relation}</p><h2>{person.name}</h2><p className="years">{person.years}</p><p className="bio">{person.bio || "Описание пока не добавлено."}</p><Info icon={<BookOpen/>} title="Учёба и работа"><p>{person.education || "Не указано"}</p><p>{person.work || "Не указано"}</p></Info><Info icon={<Users/>} title="Моменты жизни">{person.moments.length ? person.moments.map(x => <p key={x} className="moment">{x}</p>) : <p>Пока нет записей</p>}</Info><Info icon={<Archive/>} title="Источники">{person.sources.map(x => <p key={x} className="source">{x}</p>)}</Info><button className="edit-button" onClick={() => alert("Редактирование всех полей будет добавлено следующим изменением")}>Редактировать карточку</button></>}</div>
      </aside>
    </section>

    {addingTo && <div className="modal-backdrop" onMouseDown={() => setAddingTo(null)}><form className="modal" onSubmit={addPerson} onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><small>НОВАЯ СВЯЗЬ</small><h2>{person ? `Добавить родственника для ${person.name}` : "Добавить человека"}</h2></div><button type="button" className="icon-button" onClick={() => setAddingTo(null)}><X/></button></div><label>Тип связи<select name="linkType"><option value="parent">Родитель</option><option value="partner">Партнёр</option><option value="child">Ребёнок</option><option value="sibling">Брат или сестра</option><option value="relative">Другой родственник</option></select></label><label>Имя и фамилия<input name="name" required placeholder="Например, Ольга Озола"/></label><div className="form-grid"><label>Годы жизни<input name="years" placeholder="1952 — 2021"/></label><label>Кем приходится<input name="relation" placeholder="тётя"/></label></div><label>Краткая история<textarea name="bio" rows={4} placeholder="Чем человек запомнился семье..."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setAddingTo(null)}>Отмена</button><button className="primary">Добавить родственника</button></div></form></div>}
  </main>;
}

function Avatar({ p, large = false }: { p: Person; large?: boolean }) { return <span className={large ? "avatar large" : "avatar"} style={{ background: p.color }}>{p.initials}</span>; }
function TreeCard({ p, select, active, add }: { p?: Person; select:(id:string)=>void; active:string; add:(id:string)=>void }) {
  if (!p) return null;
  return <div className="tree-node"><button className={active === p.id ? "tree-card selected" : "tree-card"} onClick={() => select(p.id)}><Avatar p={p}/><span><b>{p.name}</b><small>{p.years}</small></span><em>{p.relation}</em></button>{active === p.id && <button className="node-add" title={`Добавить родственника для ${p.name}`} onClick={() => add(p.id)}><Plus size={18}/></button>}</div>;
}
function Info({ icon, title, children }: { icon:React.ReactNode; title:string; children:React.ReactNode }) { return <section className="info"><h3>{icon}{title}</h3><div>{children}</div></section>; }
