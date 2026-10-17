import re, csv, json, collections
pages = open('full.txt').read().split('\f')
P = lambda n: pages[n-1]
prov_rows=[]
for line in P(36).splitlines():
    m=re.match(r'^\s*(\d+)\s+([A-Z][A-Z .]+?)\s{2,}([\d.,]+)\s+([\d.,]+)\s*$',line)
    if m: prov_rows.append(m.groups())
PROVS=sorted({r[1].strip() for r in prov_rows},key=len,reverse=True)
provre='|'.join(re.escape(p) for p in PROVS)
rowre=re.compile(r'^\s*(\d+)\s+(.+?)\s+('+provre+r'|[A-Z]+(?: [A-Z]+)*-)\s+(\d+[.,]\d+)\s+(TINGGI|SEDANG|RENDAH)\s*$')
import subprocess
def rawpage(pg): return subprocess.run(['pdftotext','-f',str(pg),'-l',str(pg),'-raw','irbi2025.pdf','-'],capture_output=True,text=True).stdout
def fixprov(pv):
    if not pv.endswith('-'): return pv,''
    c=[p for p in PROVS if p.startswith(pv[:-1])]
    return (c[0],'nama provinsi terpotong di sumber: "'+pv+'"') if len(c)==1 else (pv,'PROVINSI TIDAK JELAS')
num=lambda s: float(s.replace(',','.'))
def section(a,b):
    out=[];bad=[]
    for pg in range(a,b+1):
        for line in P(pg).splitlines():
            m=rowre.match(line)
            if m:
                no,kk,pv,sk,kl=m.groups(); pv,cat=fixprov(pv); out.append(dict(no=int(no),provinsi=pv,kabupaten_kota=kk.strip(),skor=num(sk),kelas=kl,halaman=pg,catatan=cat))
            elif re.match(r'^\s*\d+\s+[A-Z]',line) and not re.search(r'\d[.,]\d',line):
                no=line.split()[0]
                for rl in rawpage(pg).splitlines():
                    m2=re.match(r'^'+no+r'\s+(.+?)\s+('+provre+r')\s+(\d+[.,]\d+)\s+(TINGGI|SEDANG|RENDAH)\s*$',rl.strip())
                    if m2:
                        kk,pv,sk,kl=m2.groups(); out.append(dict(no=int(no),provinsi=pv,kabupaten_kota=kk.strip(),skor=num(sk),kelas=kl,halaman=pg,catatan='baris terpecah di layout; diambil dari pdftotext -raw'))
            elif re.match(r'^\s*\d+\s+[A-Z]',line) and re.search(r'(TINGGI|SEDANG|RENDAH)',line):
                bad.append((pg,line))
    return out,bad
secs={'total':(40,57),'banjir':(212,229),'gempabumi':(230,247),'tsunami':(248,259),'letusan_gunung_api':(260,265),
'banjir_bandang':(266,281),'gelombang_ekstrem_abrasi':(282,293),'karhutla':(294,309),'tanah_longsor':(310,325),
'kekeringan':(326,343),'likuefaksi':(344,357),'cuaca_ekstrem':(358,375)}
summary={}
for k,(a,b) in secs.items():
    rows,bad=section(a,b)
    rows.sort(key=lambda r:r['no']); nos=[r['no'] for r in rows]
    missing=sorted(set(range(1,max(nos)+1))-set(nos)) if nos else []
    dup=[x for x,c in collections.Counter(nos).items() if c>1]
    dupnames=[x for x,c in collections.Counter((r['provinsi'],r['kabupaten_kota']) for r in rows).items() if c>1]
    cls=collections.Counter(r['kelas'] for r in rows)
    sk=[r['skor'] for r in rows]
    mono=all(sk[i]>=sk[i+1] for i in range(len(sk)-1))
    summary[k]=dict(pages=f'{a}-{b}',rows=len(rows),max_no=max(nos) if nos else 0,missing_no=missing,dup_no=dup,dup_names=dupnames,kelas=dict(cls),min=min(sk) if sk else None,max=max(sk) if sk else None,sorted_desc=mono,unparsed=bad,provinsi_count=len({r['provinsi'] for r in rows}))
    fn='irbi2025_kabkota_total.csv' if k=='total' else f'irbi2025_kabkota_{k}.csv'
    with open(fn,'w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=['no','provinsi','kabupaten_kota','skor','kelas','halaman','catatan']);w.writeheader();w.writerows(rows)
# provinsi: class from narrative pages
narr={}
for pg in range(58,210):
    m=re.search(r'kelas\s+risiko\s+(Tinggi|Sedang|Rendah)\s+dengan\s+nilai\s+([\d.,]+)',re.sub(r'\s+',' ',P(pg)),re.I)
    if m:
        hdr=[l.strip() for l in P(pg).splitlines() if l.strip()][:2]
        narr[pg]=(hdr,m.group(1).upper(),m.group(2).rstrip('.'))
with open('irbi2025_provinsi.csv','w',newline='') as f:
    w=csv.writer(f);w.writerow(['no','provinsi','skor_seb','skor_2025','kelas_2025','halaman_tabel','halaman_kelas'])
    used=set()
    for no,pv,seb,s25 in prov_rows:
        hit=[(pg,v) for pg,v in narr.items() if num(v[2])==num(s25) and pg not in used]
        kl,hp=('',''); 
        if len(hit)==1: used.add(hit[0][0]); kl=hit[0][1][1]; hp=hit[0][0]
        w.writerow([no,pv.strip(),num(seb),num(s25),kl,36,hp])
summary['provinsi']=dict(rows=len(prov_rows),narrative_class_found=len(narr))
json.dump(summary,open('validation.json','w'),indent=1,ensure_ascii=False)
for k,v in summary.items(): print(k,{x:y for x,y in v.items() if x!='unparsed'},'unparsed:',len(v.get('unparsed',[])))
