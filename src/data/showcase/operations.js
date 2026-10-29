const labels={
  en:{paid:'Paid',pending:'Pending',review:'In review',kpis:['Demo revenue','Demo orders','Active users','Resolution rate'],ranges:{week:'7 days',month:'30 days',quarter:'90 days'},activities:['Demo export completed','Fictional order flagged for review','Dashboard access role updated','Scheduled report generated']},
  zh:{paid:'已支付',pending:'待处理',review:'审核中',kpis:['演示收入','演示订单','活跃用户','解决率'],ranges:{week:'7 天',month:'30 天',quarter:'90 天'},activities:['演示导出已完成','虚构订单被标记为待审核','后台访问角色已更新','计划报表已生成']},
  ms:{paid:'Dibayar',pending:'Menunggu',review:'Dalam semakan',kpis:['Hasil demo','Pesanan demo','Pengguna aktif','Kadar penyelesaian'],ranges:{week:'7 hari',month:'30 hari',quarter:'90 hari'},activities:['Eksport demo selesai','Pesanan rekaan ditanda untuk semakan','Peranan akses papan pemuka dikemas kini','Laporan berjadual dijana']}
};

const series={
  week:{kpis:['RM 18.4K','146','892','96%'],revenue:[42,56,48,74,68,88,79],orders:[38,52,44,62,58,80,72]},
  month:{kpis:['RM 74.8K','612','2,840','94%'],revenue:[34,48,55,46,71,64,82,76,91,86],orders:[40,43,62,51,66,73,69,88,80,92]},
  quarter:{kpis:['RM 218K','1,834','7,260','93%'],revenue:[28,43,39,58,54,70,65,79,74,89,84,96],orders:[32,37,48,44,61,57,72,68,82,78,90,86]}
};

const transactions=[
  {id:'TX-1048',customer:'Northstar Studio',amount:'RM 4,280',status:'paid'},
  {id:'TX-1047',customer:'Juniper Works',amount:'RM 1,940',status:'pending'},
  {id:'TX-1046',customer:'Atlas & Finch',amount:'RM 3,120',status:'review'},
  {id:'TX-1045',customer:'Bluepeak Labs',amount:'RM 860',status:'paid'},
  {id:'TX-1044',customer:'Mosaic Field Co.',amount:'RM 2,450',status:'pending'}
];

export function getOperationsData(lang='en'){
  const copy=labels[lang]||labels.en;
  return {series,transactions:transactions.map((item)=>({...item,statusLabel:copy[item.status]})),statusLabels:{paid:copy.paid,pending:copy.pending,review:copy.review},kpiLabels:copy.kpis,rangeLabels:copy.ranges,activities:copy.activities};
}
