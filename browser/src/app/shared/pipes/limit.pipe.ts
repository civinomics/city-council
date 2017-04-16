import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'limit'
})
export class LimitPipe implements PipeTransform {

    transform(value: any[], max: number): any {
        return value.length <= max ? value : value.slice(0, max);
    }

}
