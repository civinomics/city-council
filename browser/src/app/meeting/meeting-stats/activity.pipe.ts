import { Pipe, PipeTransform } from '@angular/core';
import { Item, ItemStatsAdt } from '../../item/item.model';

@Pipe({
  name: 'activity'
})
export class ActivityPipe implements PipeTransform {

  transform(arr: Item[], stats: { [id: string]: { total: ItemStatsAdt } }, has: boolean = true): any {
    return arr.filter(item => hasActivity(stats[ item.id ].total) == has);
  }

}


export const hasActivity = (stats: ItemStatsAdt) => (
stats.comments.pro +
stats.comments.con +
stats.comments.neutral +
stats.votes.yes +
stats.votes.no)
> 0;
