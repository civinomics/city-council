import {
  AfterContentInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { EMAIL_REGEX } from '../../shared/constants';
import { MdInputDirective } from '@angular/material';
import { User } from '../../user/user.model';
import { GroupCreateInput } from '../../group/group.model';
import { OfficeCreateInput } from '../../group/office.model';

@Component({
  selector: 'civ-group-setup-view',
  templateUrl: './group-setup-view.component.html',
  styleUrls: [ './group-setup-view.component.scss' ]
})
export class GroupSetupViewComponent implements OnInit, AfterContentInit, OnChanges {

  @Input() adminSearchResult: User | null;
  @Input() error: string;
  @Output() adminEmailChanged: EventEmitter<string> = new EventEmitter();
  @Output() submit: EventEmitter<GroupCreateInput> = new EventEmitter();

  groupForm = new FormGroup({
    name: new FormControl('', [ Validators.required ]),
    icon: new FormControl('', [ Validators.required ]),
    districts: new FormArray([])
  });

  adminForm = new FormGroup({
    email: new FormControl('', [ Validators.required, Validators.pattern(EMAIL_REGEX) ])
  });

  hasDistricts: boolean = false;
  adminExtant: boolean = true;
  adminEmailQueryLoading: boolean = false;


  @ViewChild('nameInput', { read: MdInputDirective }) nameInput: MdInputDirective;


  constructor() {

  }


  ngOnInit() {
    this.adminForm.controls[ 'email' ].valueChanges.subscribe(value => {
      this.adminEmailChanged.emit(value);
      this.adminEmailQueryLoading = true;
    })
  }

  ngOnChanges(changes: SimpleChanges): void {

  }


  ngAfterContentInit() {
    setTimeout(() => {
      this.nameInput.focus();
    }, 1000);
  }


  setHasDistricts(val: any) {
    this.hasDistricts = val.checked;
    if (this.hasDistricts && this.districts.length == 0) {
      this.addDistrict();
    }
  }

  get districts(): FormArray {
    return this.groupForm.controls[ 'districts' ] as FormArray;
  }

  addDistrict() {
    this.districts.push(this.newDistrict());
  };


  private newDistrict() {
    return new FormGroup({
      name: new FormControl('', [ Validators.required ]),
      shapefileIdentifier: new FormControl(''),
      repName: new FormControl('', [ Validators.required ]),
      repEmail: new FormControl('', [ Validators.required, Validators.pattern(EMAIL_REGEX) ]),
      repIcon: new FormControl('', [ Validators.required ])
    });
  }

  doSubmit() {

    let data: GroupCreateInput = {
      name: this.groupForm.controls[ 'name' ].value,
      icon: this.groupForm.controls[ 'icon' ].value,
      districts: [],
      adminId: this.adminSearchResult.id
    };

    if (this.hasDistricts) {
      let districtsArr = this.groupForm.controls[ 'districts' ] as FormArray;
      for (let i = 0; i < districtsArr.controls.length; i++) {
        data.districts.push(parseDistrict(districtsArr.controls[ i ] as FormGroup))
      }
    }

    this.submit.emit(data);

    function parseDistrict(form: FormGroup): OfficeCreateInput {
      let name = form.controls[ 'repName' ].value;

      return {
        name: form.controls[ 'name' ].value,
        shapefileIdentifier: form.controls[ 'shapefileIdentifier' ].value,
        representative: {
          firstName: name.split(' ')[ 0 ],
          lastName: name.split(' ')[ 1 ],
          icon: form.controls[ 'repIcon' ].value,
          email: form.controls[ 'repEmail' ].value,
        }
      }
    }


  }


}
