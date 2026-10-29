const labels={
  en:{lead:'Lead',active:'Active',paused:'Paused',activities:['Discovery note added','Demo proposal viewed','Follow-up task created']},
  zh:{lead:'潜在线索',active:'合作中',paused:'已暂停',activities:['已添加需求探索记录','已查看演示方案','已创建跟进任务']},
  ms:{lead:'Prospek',active:'Aktif',paused:'Dijeda',activities:['Nota penemuan ditambah','Cadangan demo dilihat','Tugas susulan dicipta']}
};

const base=[
  {id:'c1',name:'Avery Tan',company:'Northstar Studio',email:'avery@example.test',status:'active',lastContact:'2026-10-28',tags:['Priority','Web App']},
  {id:'c2',name:'Mika Rahman',company:'Juniper Works',email:'mika@example.test',status:'lead',lastContact:'2026-10-25',tags:['Discovery','CRM']},
  {id:'c3',name:'Jordan Lee',company:'Atlas & Finch',email:'jordan@example.test',status:'paused',lastContact:'2026-10-19',tags:['Integration','Review']},
  {id:'c4',name:'Samira Noor',company:'Bluepeak Labs',email:'samira@example.test',status:'active',lastContact:'2026-10-29',tags:['Mobile','Support']},
  {id:'c5',name:'Kai Morgan',company:'Mosaic Field Co.',email:'kai@example.test',status:'lead',lastContact:'2026-10-21',tags:['Booking','Prototype']}
];

export function getCustomerData(lang='en'){
  const copy=labels[lang]||labels.en;
  return {statuses:{lead:copy.lead,active:copy.active,paused:copy.paused},customers:base.map((item,index)=>({...item,statusLabel:copy[item.status],activities:copy.activities.map((text,activityIndex)=>({date:`2026-10-${String(28-index*2-activityIndex).padStart(2,'0')}`,text}))}))};
}
