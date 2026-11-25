// Turn repetitive static audit hints into actionable, deduplicated work items.
const recommendations={
 'missing-local-asset':['Fehlende lokale Ressourcen prüfen','Referenzen und Build-Ausgabe abgleichen; zuerst echte 404 ausschließen.'],
 'priority-conflict':['Widersprüchliche Bildpriorität','Lazy Loading und hohe Fetch-Priorität nicht gleichzeitig setzen. LCP-Kandidaten im Browser prüfen.'],
 'responsive-image':['Große Bilder prüfen','Responsive Varianten und tatsächliche sizes prüfen; visuelle Freigabe erforderlich.'],
 'image-dimensions':['Bilddimensionen ergänzen','Intrinsische Breite/Höhe oder geeignetes Seitenverhältnis prüfen; CLS im Browser messen.'],
 'script-review':['Skript-Ladereihenfolge prüfen','Abhängigkeiten und Inline-Skripte prüfen, dann gezielt defer testen.'],
 'css-review':['Stylesheet-Auslieferung prüfen','CSS-Coverage und kritische Darstellung prüfen; nicht blind löschen.'],
 'css-budget':['CSS-Budget überschritten','Gemeinsame Stylesheets und CSS-Abhängigkeiten untersuchen.'],
 'js-budget':['JS-Budget überschritten','Skriptgröße, Abhängigkeiten und Ausführungszeit untersuchen.'],
 'html-budget':['HTML-Budget überschritten','Inline-Inhalte und wiederholtes Markup prüfen.'],
 'third-party-review':['Externe Ressourcen prüfen','Notwendigkeit, Datenschutz und tatsächliche Ladezeit prüfen.'],
 'invalid-base':['Ungültige Basis-URL prüfen','HTML-Basis-URL und Ressourcenauflösung kontrollieren.']
};
const severity={high:3,medium:2,low:1};
export function prioritizeAudit(report){
 if(!Array.isArray(report?.pages))throw Error('Expected static audit');
 const groups=new Map();let occurrences=0;
 for(const page of report.pages){
   for(const finding of page.findings??[]){
     occurrences++;
     // Budgets and per-page summaries are page-specific; asset hints group across pages.
     const specific=/(?:-budget|third-party-review|invalid-base)$/.test(finding.id);
     const key=JSON.stringify([finding.id,specific?page.path:finding.detail]);
     const g=groups.get(key)??{id:finding.id,detail:finding.detail,priority:finding.priority,pages:new Set(),occurrences:0};
     if((severity[finding.priority]??0)>(severity[g.priority]??0))g.priority=finding.priority;
     g.pages.add(page.path);g.occurrences++;groups.set(key,g);
   }
 }
 const items=[...groups.values()].map(g=>{
   const [title,action]=recommendations[g.id]??[g.id,'Manuell prüfen.'];
   return {...g,title,action,pages:[...g.pages].sort(),affectedPages:g.pages.size};
 }).sort((a,b)=>(severity[b.priority]??0)-(severity[a.priority]??0)||b.affectedPages-a.affectedPages||b.occurrences-a.occurrences||a.id.localeCompare(b.id)||a.detail.localeCompare(b.detail));
 return {mode:'prioritized-static-review',occurrences,uniqueItems:items.length,high:items.filter(x=>x.priority==='high').length,items,limitations:['Statische Hinweise, keine nachgewiesenen Performance-Fehler.','Sortierung nach Schweregrad und betroffenen Seiten, nicht nach geschätzten Millisekunden.','Keine automatische Änderung und keine garantierte Verbesserung.']};
}
