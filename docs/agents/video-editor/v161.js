// ================= V161 · STUDIO family: names, themes, photo sizes, and the display fonts in every weight
(function(){
const N={x_c_editorial:'פתיח מגזין',x_c_contrast:'ניגוד משקלים',x_c_term:'מילון מונחים',x_c_bars:'גרף עמודות',x_c_blueprint:'פרט שרטוט',x_c_scenario:'תרחיש מהשטח',x_c_dilemma:'בעד ונגד',x_c_compare:'טבלת השוואה',x_c_steps:'שלבים',x_c_insight:'תובנה',x_c_material:'כרטיס חומר',x_c_cover:'שער מגזין',x_c_mistake:'טעות ותיקון',x_c_stat:'מספר אחד',x_c_questions:'שאלות לשאול',x_c_thought:'פוסט מקצועי',x_c_grid4:'ארבעה אריחים'};
try{Object.assign(ED_NAMES,N)}catch(e){}
try{Object.assign(DEF_THEME,{x_c_editorial:'light',x_c_contrast:'dark',x_c_term:'light',x_c_bars:'light',x_c_blueprint:'teal',x_c_scenario:'dark',x_c_dilemma:'light',x_c_compare:'white',x_c_steps:'dark',x_c_insight:'light',x_c_material:'dark',x_c_cover:'dark',x_c_mistake:'red',x_c_stat:'dark',x_c_questions:'light',x_c_thought:'light',x_c_grid4:'light'})}catch(e){}
try{Object.assign(DEST,{x_c_editorial:[1080,560],x_c_cover:[1080,1350],x_c_stat:[1080,1350]})}catch(e){}
try{window.__v154=(window.__v154||[]).concat(Object.keys(N))}catch(e){}
// Heebo 100 to 900 and Frank Ruhl Libre 300 to 900, both with Hebrew. Canvas draws only loaded faces, so load them and redraw.
try{if(!document.getElementById('v161f')){const l=document.createElement('link');l.id='v161f';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Heebo:wght@100;200;300;400;500;600;700;800;900&family=Frank+Ruhl+Libre:wght@300;400;500;600;700;800;900&display=swap';document.head.appendChild(l);
  l.onload=()=>{const want=[100,200,300,400,700,800,900].map(w=>document.fonts.load(`${w} 40px Heebo`,'קורקוס')).concat([400,500,700,900].map(w=>document.fonts.load(`${w} 40px "Frank Ruhl Libre"`,'קורקוס')));
    Promise.all(want).then(()=>{window.__v161ready=1;try{TC.clear()}catch(e){}try{render()}catch(e){}}).catch(()=>{})}}}catch(e){}
})();
