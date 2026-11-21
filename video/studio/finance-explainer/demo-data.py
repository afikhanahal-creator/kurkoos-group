import random, uuid, datetime, subprocess
random.seed(7)
B={'קורקוס גרופ':'e5661bee-0de5-48d3-a11f-a7f4ed67254d','קורקוס ביצוע':'2f471cb7-b63b-48c8-9a87-af0da81c864e','הנרייטה סולד':'c3ed33d2-432b-4b3a-911c-8a508262e47f','ראיתה':'16f79187-61f8-4b43-abea-b75c781b18dd','אפיק':'f359b603-fab9-4973-8f99-c0d39b15ac23'}
PROJ={'e5661bee-0de5-48d3-a11f-a7f4ed67254d':['0e9a4c42-f9ac-40ce-92f5-b59ff861ab30','fd96f646-3515-4592-9e58-d11228b282fe'],'c3ed33d2-432b-4b3a-911c-8a508262e47f':['aa37a06e-2c74-4669-8205-3465259ad0f8']}
# supplier, category, [min,max], doc_type, weight of businesses, monthly?
SUP=[('בזק בינלאומי','תקשורת ואינטרנט',(180,420),'invoice_receipt',1),('חברת החשמל','חשמל, מים וארנונה',(600,2400),'supplier_bill',1),('פז חברת נפט','רכב ודלק',(250,900),'invoice_receipt',2),
('מחסני חשמל','ציוד וכלים',(300,3800),'invoice',1),('רדימיקס בטון','חומרי בניין',(8000,42000),'invoice',1),('טמבור','חומרי בניין',(900,6500),'invoice',1),('אקרשטיין תעשיות','חומרי בניין',(4000,26000),'invoice',1),
('י.ד. עבודות עפר','קבלני משנה',(12000,58000),'invoice',1),('אלומיניום הצפון','קבלני משנה',(9000,36000),'invoice',1),('משרד עו״ד לוי ושות׳','ייעוץ משפטי',(2500,9000),'invoice_receipt',1),
('אדריכלים שגיא ורון','ייעוץ הנדסי',(6000,22000),'invoice',1),('הראל ביטוח','ביטוח',(1200,4800),'receipt',1),('Google Workspace','תוכנה ומנויים',(120,480),'invoice_receipt',1),
('מטא פרסום','פרסום ושיווק',(1500,9500),'receipt',1),('עיריית הוד השרון','אגרות והיטלים',(900,7800),'supplier_bill',1),('אופיס דיפו','משרד וציוד משרדי',(150,1200),'invoice_receipt',1),('רמי לוי תקשורת','תקשורת ואינטרנט',(90,260),'invoice_receipt',1)]
q=lambda s: "'"+str(s).replace("'","''")+"'"
out=["set session_replication_role = replica;","delete from fin_documents;","delete from fin_categories where name ~ 'ציוד צילום';",
"update fin_suppliers set archived_at=now(), status='archived' where true;"]
sid={}
for i,(n,c,_,_,_) in enumerate(SUP):
    sid[n]=str(uuid.uuid4()); vat=str(510000000+random.randint(1000,999999))
    out.append(f"insert into fin_suppliers (id,name,vat_id,vat_number,default_category,status,normalized_name) values ({q(sid[n])},{q(n)},{q(vat)},{q(vat)},{q(c)},'active',{q(n)});")
today=datetime.date(2026,11,21); n=0
weights={'קורקוס גרופ':3,'קורקוס ביצוע':4,'הנרייטה סולד':3,'ראיתה':2,'אפיק':2}
for m in range(7):   # months back
    first=(today.replace(day=1)-datetime.timedelta(days=30*m)).replace(day=1)
    count=random.randint(15,21) if m else 13
    grow=1.0-0.07*m
    for _ in range(count):
        s=random.choice(SUP); bn=random.choices(list(weights),list(weights.values()))[0]; bid=B[bn]
        day=random.randint(1,28 if m else 20); d=first.replace(day=day)
        total=round(random.uniform(*s[2])*grow,2); before=round(total/1.18,2); vat=round(total-before,2)
        st='review' if (m==0 and random.random()<0.45) else ('sent' if m>=2 else 'approved')
        if m==1 and random.random()<0.15: st='review'
        pid=random.choice(PROJ.get(bid,[None])+[None]) if s[1] in('חומרי בניין','קבלני משנה','ייעוץ הנדסי','ציוד וכלים') else None
        n+=1; src=random.choice(['gmail','gmail','gmail','whatsapp','upload','camera'])
        conf=round(random.uniform(0.9,0.99),2) if st!='review' else round(random.uniform(0.62,0.9),2)
        ap = "now()" if st!='review' else 'null'
        out.append(f"""insert into fin_documents (id,business_id,project_id,supplier_id,supplier_name,supplier_vat_id,doc_type,doc_number,issue_date,currency,amount_before_vat,vat_amount,total_amount,category,category_id,status,source,file_name,file_mime,confidence,issues,approved_at,sent_at,created_at,updated_at,email_date,paid,stage,processed_at)
 values (gen_random_uuid(),{q(bid)},{q(pid) if pid else 'null'},{q(sid[s[0]])},{q(s[0])},(select vat_id from fin_suppliers where id={q(sid[s[0]])}),{q(s[3])},{q(str(random.randint(10000,99999)))},{q(d)},'ILS',{before},{vat},{total},{q(s[1])},(select id from fin_categories where name={q(s[1])} limit 1),{q(st)},{q(src)},{q(s[0]+' '+d.strftime('%m-%Y')+'.pdf')},'application/pdf',{conf},'[]'::jsonb,{ap},{"now()" if st=='sent' else 'null'},{q(str(d)+' 09:1'+str(n%10)+':00+02')},{q(str(d)+' 09:20:00+02')},{q(str(d)+' 08:00:00+02')},{'true' if s[3] in('invoice_receipt','receipt') else 'false'},'done',{q(str(d)+' 09:15:00+02')});""")
out.append("update fin_projects set archived_at = now() where name ~ 'פרויקט עם שם ארוך';" )
open('demo-data.sql','w').write('\n'.join(out)); print(n,'docs')
