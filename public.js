let options=[],config={},lastTotal=0;
const $=id=>document.getElementById(id);
const selected=id=>options.find(o=>String(o.id)===$(id==='tipo'||id==='acabado'?$(id).value:''));
async function load(){
 const [c,o]=await Promise.all([db.from('configuracion').select('*'),db.from('opciones_presupuesto').select('*').eq('activo',true).order('orden')]);
 if(c.error||o.error){show('feedback','No se pudieron cargar los precios. Revisa la configuración de Supabase.',true);return;}
 config=Object.fromEntries(c.data.map(x=>[x.clave,Number(x.valor)]));options=o.data;
 for(const [cat,id] of [['tipo_vivienda','tipo'],['acabados','acabado']]){$(id).innerHTML=options.filter(x=>x.categoria===cat).map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');}
 $('extras').innerHTML=options.filter(x=>x.categoria==='extras').map(x=>`<label class="check"><input type="checkbox" value="${x.id}" class="extra"> ${esc(x.nombre)} · ${euros(x.valor)}</label>`).join('');
 $('area').min=config.superficie_minima||1;$('area').max=config.superficie_maxima||100000;
 document.querySelectorAll('#area,#tipo,#acabado,.extra').forEach(x=>x.addEventListener('input',calculate));calculate();
}
function calculate(){const area=Number($('area').value)||0,t=selected('tipo'),a=selected('acabado');if(!t||!a)return;
 const extras=Array.from(document.querySelectorAll('.extra:checked')).map(x=>options.find(o=>String(o.id)===x.value));
 const base=area*(config.precio_m2||0);const extrasValue=extras.reduce((s,o)=>s+Number(o.valor),0);lastTotal=Math.round((base*Number(t.valor)*Number(a.valor)+extrasValue)*100)/100;
 $('base').textContent=euros(base);$('factorTipo').textContent='× '+t.valor;$('factorAcabado').textContent='× '+a.valor;$('extrasTotal').textContent=euros(extrasValue);$('total').textContent=euros(lastTotal);
}
$('quoteForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('sendBtn');const area=Number($('area').value);if(area<(config.superficie_minima||1)||area>(config.superficie_maxima||100000)){show('feedback','La superficie está fuera de los límites permitidos.',true);return;}
 btn.disabled=true;btn.textContent='Enviando...';
 const payload={nombre:$('nombre').value.trim(),apellidos:$('apellidos').value.trim(),email:$('email').value.trim(),telefono:$('telefono').value.trim(),superficie_m2:area,tipo_id:Number($('tipo').value),acabado_id:Number($('acabado').value),extra_ids:Array.from(document.querySelectorAll('.extra:checked')).map(x=>Number(x.value)),provincia:$('provincia').value.trim(),localidad:$('localidad').value.trim(),comentarios:$('comentarios').value.trim()};
 const {data,error}=await db.rpc('crear_solicitud_publica',{datos:payload});if(error){show('feedback','No se ha podido enviar la solicitud: '+error.message,true)}else{show('feedback','¡Gracias! Hemos registrado tu solicitud. Referencia: '+data);$('quoteForm').reset();calculate();window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});}btn.disabled=false;btn.textContent='Enviar mi solicitud';
});load();
