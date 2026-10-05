#!/usr/bin/env python3
"""Mirror of the engine's text criteria (pxQuality + check). Usage: python3 textcheck.py out.jsonl
Each line: {"id","headline","sub","eyebrow","cta","fb","ig"}. Prints per-post score of the text criteria and problems.
The engine score = average of 8: hook, value, visual, brand, orig, share, save, traffic.
visual/orig depend on photo and the whole pool (checked later); this tool assumes visual 10, brand 9, orig 10 if opening unique in file."""
import json,re,sys,collections
BAN=['הכי טוב','מוביל','איכות ללא פשרות','בית החלומות','יוקרתי במיוחד','הזדמנות שלא תחזור','!!!']
def body_of(fb): b=re.split(r'\n\nקבוצת קורקוס',fb or '')[0]; return re.sub(r'\n\nלכתבה המלאה:.*$','',b,flags=re.S)
def strip(s): return re.sub(r'\*','',s or '')
def score(r,openings):
  h=strip(r.get('headline','')).replace('\n',' ');fb=r.get('fb','');b=body_of(fb);words=len(b.split());hw=len(h.split());P=[]
  hk=10
  if hw>8: hk-=3;P.append(f'headline {hw} words (max 7)')
  if not re.search(r'\d|\?|לא |בלי|מיתוס|טעות|למה|כמה|איך|אין ',h): hk-=2;P.append('headline needs a number, a question, or one of: לא/בלי/למה/כמה/איך/טעות/מיתוס/אין')
  o=' '.join(b.split()[:3])
  if openings[o]>1: hk-=3;P.append('opening (first 3 words) repeats another post: '+o)
  va=6+(1 if re.search(r'\d',b) else 0)+(1 if re.search(r'שמרו|בדקו|לפני ש|טיפ|טעות|כלל|שלבים|בדיקות',b) else 0)
  if words<35: va-=3;P.append(f'body {words} words (min 35)')
  if words>190: va-=2;P.append(f'body {words} words (max 190)')
  br=9
  if any(w in fb for w in BAN): br-=4;P.append('banned phrase')
  if re.search(r'\s[—–]\s|\s-\s',b) or re.search(r'[—–]',fb+h): br-=3;P.append('dash used as punctuation')
  if re.search(r'\[[^\]]+\]',fb+h): P.append('BLOCK: square brackets left')
  sh=5+(4 if re.search(r'תייגו|שתפו|שלחו ל',b) else 0)+(1 if re.search(r'מסכימים|עמדה|לדעתנו|אנחנו חושבים',b) else 0)
  if sh<9: P.append('share: body needs תייגו / שתפו / שלחו ל... (and ideally לדעתנו / אנחנו חושבים / מסכימים)')
  lines=len(re.findall(r'\n\d\.|\n[^\n]{0,30}:',b))
  sv=4+(4 if 'שמרו' in b else 0)+(2 if lines>2 else 0)
  if sv<10: P.append(f'save: body needs "שמרו" and 3+ list lines that start with "1." or a short label and colon (found {lines})')
  tr=3+(4 if re.search(r'https?://',fb) else 0)+(2 if '055-981-1814' in fb else 0)+(2 if re.search(r'כתבו "|כתבו \'|בתגובה|בתגובות',b) else 0)
  if tr<10: P.append('traffic: fb needs https:// link, 055-981-1814, and body needs a comment ask (כתבו "מילה" בתגובות)')
  sub=r.get('sub','') or ''
  if len(sub.split())>14: P.append('sub longer than 12 words')
  if len(h)>38: P.append(f'headline {len(h)} chars (max 38 for mobile)')
  if re.search(r'[\U0001F300-\U0001FAFF☀-➿]',fb+h+sub): P.append('emoji')
  if not fb.rstrip().endswith('#הודהשרון') and '#קבוצתקורקוס' not in fb: P.append('missing signature hashtags')
  cl=lambda x:max(0,min(10,x))
  sc=dict(hook=cl(hk),value=cl(va),visual=10,brand=cl(br),orig=10 if openings[o]<=1 else 7.5,share=cl(sh),save=cl(sv),traffic=cl(tr))
  return round(sum(sc.values())/8,2),sc,P
if __name__=='__main__':
  rows=[json.loads(l) for l in open(sys.argv[1],encoding='utf8') if l.strip()]
  op=collections.Counter(' '.join(body_of(r.get('fb','')).split()[:3]) for r in rows)
  bad=0
  for r in rows:
    a,sc,P=score(r,op)
    if a<9.3 or P: bad+=1;print(r.get('id'),a,'|'.join(P))
  print(f'checked {len(rows)}, needing work {bad}')
