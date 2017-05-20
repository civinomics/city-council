import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Item } from '../../../item/item.model';

@Component({
  selector: 'civ-create-item',
  template: `
    <div *ngIf="form != null" [formGroup]="form" fxLayout="column">
      <div fxLayout="row" fxLayoutAlign="start start">
        <md-input-container class="item-number input" fxFlex="1 1 2.75em">
          <span md-prefix class="num-sign">#</span>
          <input mdInput type="number" formControlName="itemNumber" maxlength="3">
          <span md-suffix class="colon">:</span>
        </md-input-container>
        <md-input-container class="text input" fxFlex="1 1">
          <textarea autosize mdInput formControlName="text" rows="1"></textarea>
          <md-placeholder><span style="padding-left:10px">Item Text</span></md-placeholder>
        </md-input-container>
      </div>
      <div class="resources"
           fxLayout="row"
           fxLayoutWrap="wrap"
           fxLayoutAlign="start center"
           fxLayoutGap="10px"
           formArrayName="resourceLinks"
           fxFlexAlign="center">
        <div class="heading">Resources: <span *ngIf="!hasResources()" style="font-style: italic"> NONE </span></div>

        <md-input-container *ngFor="let url of form.controls['resourceLinks'].controls; let i = index"
                            [formGroupName]="i">
          <input mdInput type="url" formControlName="url">
          <md-icon md-suffix class="remove-resource" (click)="removeResource(i)">remove_circle_outline</md-icon>
        </md-input-container>
        <button md-icon-button color="primary" (click)="addResource()">
          <md-icon class="add-circle">add_circle</md-icon>
        </button>
      </div>
    </div>
  `,
  styles: [ `
    :host { display: block; width: 100% }

    .num-sign { font-size: 0.6em; margin-right: 2px }

    .num-sign, .item-number { font-weight: 600 }

    .remove-resource { color: #ff5722; cursor: pointer; transition: 150ms linear color }

    .remove-resource:hover { color: #8B3112 }

    .input.text textarea { padding-left: 10px }
  ` ]
})
export class CreateItemComponent implements OnInit {

  @Input() form: FormGroup;


  static build(itemNo: number, item?: Item): FormGroup {
    let resourceLinks: FormArray = new FormArray([]);

    if (item && item.resourceLinks) {
      item.resourceLinks.forEach(link =>
        resourceLinks.push(new FormGroup({ url: new FormControl(link, [ Validators.required ]) }))
      );
    }

    return new FormGroup({
      itemNumber: new FormControl(itemNo || null),
      text: new FormControl(item && item.text || '', [ Validators.required ]),
      resourceLinks
    });
  }

  hasResources() {
    return (this.form.controls[ 'resourceLinks' ] as FormArray).controls.length > 0
  }

  addResource() {
    if (!!this.form) {
      (this.form.controls[ 'resourceLinks' ] as FormArray).push(
        new FormGroup({ url: new FormControl('https://', [ Validators.required ]) })
      )
    }
  }

  removeResource(idx: number) {
    (this.form.controls[ 'resourceLinks' ] as FormArray).removeAt(idx);
  }

  constructor() { }

  ngOnInit() {
  }


}
