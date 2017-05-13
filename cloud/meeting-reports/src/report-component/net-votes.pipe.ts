import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'netVotes'
})
export class NetVotesPipe implements PipeTransform {

  transform(arr: { voteStats: { up: number, down: number } }[]): any {
    return arr.sort((x, y) => (y.voteStats.up - y.voteStats.down) - (x.voteStats.up - x.voteStats.down))
  }

}

