import { packAllInboundItems } from './src/utils/totePackingUtils.js';

console.log('토트박스 패킹 시작...');

const result = await packAllInboundItems();

if (result.success) {
  console.log(`성공! ${result.total_totes}개 토트박스 생성됨`);
  
  result.results.forEach(tote => {
    console.log(` ${tote.tote_id}: ${tote.packed_count}개 아이템 (${tote.total_weight}kg)`);
    tote.items.forEach(item => {
      console.log(`   - ${item.name} (${item.weight}kg) → ${item.to_location}`);
    });
  });
} else {
  console.log('실패:', result.error);
} 