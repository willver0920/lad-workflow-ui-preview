// 既存のフォーム表示を保ち、デモでは外部送信を行わない。
const $=selector=>document.querySelector(selector)
const form=$('#request-form'),review=$('#review-form')
const fields=()=>[...form.elements].filter(field=>field.name)
function cadOther(target){
  const other=target.querySelector('[name="cadTypeOther"]')
  if(!other)return
  const enabled=target.querySelector('[name="cadType"]')?.value==='その他'
  other.closest('label').hidden=!enabled;other.disabled=!enabled;other.required=enabled
}
for(const target of [form,review])target.addEventListener('change',()=>cadOther(target))
function step(name){
  for(const key of ['input','review','done'])$('#'+key+'-step').hidden=key!==name
  document.querySelectorAll('.steps li').forEach((li,index)=>li.classList.toggle('active',index===(name==='input'?0:1)))
  window.scrollTo(0,0)
}
document.querySelectorAll('input[type=file]').forEach(input=>{
  input.required=true
  input.addEventListener('change',()=>{
    const file=input.files[0]
    input.setCustomValidity(file?.size>50*1024*1024?'50MB以内のファイルを選択してください。':'')
    $('#'+input.id+'-status').textContent=file?.name||'未添付'
  })
})
form.onsubmit=event=>{
  event.preventDefault()
  $('#review-basic').replaceChildren()
  for(const field of fields()){
    const copy=field.closest('label').cloneNode(true),cloned=copy.querySelector('[name]')
    copy.removeAttribute('id');cloned.value=field.value
    $('#review-basic').append(copy)
  }
  cadOther(review)
  $('#review-drawing').replaceChildren()
  for(const [name,label]of [['prefecture','都道府県'],['floors','階数'],['floorArea','延床面積（㎡）']]){
    const group=document.createElement('label'),input=document.createElement('input')
    group.textContent=label;input.name=name;input.required=true
    if(name!=='prefecture'){input.type='number';input.min='1';if(name==='floorArea')input.step='0.01'}
    group.append(input);$('#review-drawing').append(group)
  }
  $('#review-warning').hidden=false
  $('#review-warning').textContent='画面確認用のため、図面読取り・外部送信は行いません。'
  review.elements.requestNotes.value=$('#request-notes').value
  $('#review-documents').textContent=[...document.querySelectorAll('input[type=file]')].map(input=>input.files[0]?.name).filter(Boolean).join(' / ')
  $('#review-checked').checked=false;step('review')
}
$('#review-back').onclick=()=>{
  for(const field of fields())field.value=review.elements[field.name]?.value??field.value
  $('#request-notes').value=review.elements.requestNotes.value
  cadOther(form);step('input')
}
review.onsubmit=event=>{
  event.preventDefault();step('done')
  $('#done-step h2').textContent='入力内容を確認しました'
  $('#done-step h2+p').textContent='デモのため、受付・スプレッドシート転記・資料保存は実行していません。'
}
$('#new').onclick=()=>{form.reset();review.reset();cadOther(form);step('input')}
