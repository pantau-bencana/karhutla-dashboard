import re,csv
lay=open('full.txt').read().split('\f')
raw=open('prov_sections.txt').read().split('\f')
num=lambda s: float(s.replace(',','.'))
prov=list(csv.DictReader(open('irbi2025_provinsi.csv')))
narr={}
for i,p in enumerate(raw):
    t=re.sub(r'\s+',' ',p)
    m=re.search(r'IRBI\)\s*(?:tahun\s*)?2025,?\s*(?:pada\s*)?(?:Provinsi\s*)?(.+?)\s+memiliki\s+kelas\s*risiko\s+(\w+)\s+dengan\s+nilai\s+([\d.,]+\d)',t,re.I)
    if m: narr[m.group(1).upper().strip()]=(58+i,m.group(2).upper(),num(m.group(3)))
def ambang(s): return 'RENDAH' if s<14.67 else ('SEDANG' if s<=176.0 else 'TINGGI')
out=[]
for r in prov:
    n=narr.get(r['provinsi'])
    s=float(r['skor_2025'])
    row=dict(no=r['no'],provinsi=r['provinsi'],skor_seb=r['skor_seb'],skor_2025=s,kelas_menurut_ambang_hal35=ambang(s),
        kelas_narasi=n[1] if n else '',skor_narasi=n[2] if n else '',halaman_narasi=n[0] if n else '',halaman_tabel=36)
    row['catatan']='' if n and abs(n[2]-s)<0.005 and n[1]==ambang(s) else ('tidak ditemukan narasi' if not n else f'narasi hal {n[0]} berbeda dari tabel hal 36 (narasi {n[1]} {n[2]})')
    out.append(row)
with open('irbi2025_provinsi.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(out[0]));w.writeheader();w.writerows(out)
for r in out:
    if r['catatan']: print(r['provinsi'],r['skor_2025'],r['catatan'])
# cross-check per-province kab tables vs national
tot={ (r['provinsi'],r['kabupaten_kota']):r for r in csv.DictReader(open('irbi2025_kabkota_total.csv'))}
starts=sorted((v[0],k) for k,v in narr.items())
ok=bad=0;seen=set();mism=[]
for idx,(st,pv) in enumerate(starts):
    end=starts[idx+1][0]-1 if idx+1<len(starts) else 209
    for pg in range(st,end+1):
        for l in lay[pg-1].splitlines():
            m=re.match(r'^\s*(\d+)\s+(.+?)\s{2,}(\d+,\d+)\s+(TINGGI|SEDANG|RENDAH)\s*$',l)
            if m:
                k=(pv,m.group(2).strip()); t=tot.get(k)
                if t and abs(float(t['skor'])-num(m.group(3)))<0.005 and t['kelas']==m.group(4): ok+=1; seen.add(k)
                else: bad+=1; mism.append((pg,pv,m.group(2).strip(),m.group(3),m.group(4),t and (t['skor'],t['kelas'])))
print('crosscheck ok',ok,'mismatch',bad,'national rows not seen in provincial tables',len(set(tot)-seen))
for x in mism: print(x)
