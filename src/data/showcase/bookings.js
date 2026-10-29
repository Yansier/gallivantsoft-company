const labels={
  en:{pending:'Pending',confirmed:'Confirmed',completed:'Completed',cancelled:'Cancelled',services:['Workflow consultation','Product discovery session','Integration review','Interface planning workshop']},
  zh:{pending:'待确认',confirmed:'已确认',completed:'已完成',cancelled:'已取消',services:['工作流咨询','产品需求探索会议','系统集成评审','界面规划工作坊']},
  ms:{pending:'Menunggu',confirmed:'Disahkan',completed:'Selesai',cancelled:'Dibatalkan',services:['Konsultasi aliran kerja','Sesi penemuan produk','Semakan integrasi','Bengkel perancangan antara muka']}
};

const base=[
  {id:'BK-2408',customer:'Northstar Studio',service:0,schedule:'2026-11-04 · 10:00',amount:'RM 480',status:'pending'},
  {id:'BK-2407',customer:'Juniper Works',service:1,schedule:'2026-11-02 · 14:30',amount:'RM 620',status:'confirmed'},
  {id:'BK-2406',customer:'Atlas & Finch',service:2,schedule:'2026-10-30 · 09:00',amount:'RM 760',status:'completed'},
  {id:'BK-2405',customer:'Bluepeak Labs',service:3,schedule:'2026-11-08 · 11:00',amount:'RM 540',status:'pending'},
  {id:'BK-2404',customer:'Mosaic Field Co.',service:0,schedule:'2026-10-27 · 15:00',amount:'RM 480',status:'cancelled'}
];

export function getBookingData(lang='en'){
  const copy=labels[lang]||labels.en;
  return {statuses:{pending:copy.pending,confirmed:copy.confirmed,completed:copy.completed,cancelled:copy.cancelled},orders:base.map((item)=>({...item,service:copy.services[item.service],statusLabel:copy[item.status]}))};
}
