import {
  AfterContentInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { EMAIL_REGEX } from '../../shared/constants';
import { MdInputDirective } from '@angular/material';
import { User } from '../../user/user.model';
import { Group, GroupCreateInput } from '../../group/group.model';
import { OfficeCreateInput } from '../../group/office.model';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'civ-group-edit-view',
  templateUrl: './group-edit-view.component.html',
  styleUrls: [ './group-edit-view.component.scss' ]
})
export class GroupEditViewComponent implements OnInit, AfterContentInit {

  @Input() adminSearchResult: User | null;
  @Input() error: string;
  @Output() adminEmailChanged: EventEmitter<string> = new EventEmitter();
  @Output() submit: EventEmitter<GroupCreateInput> = new EventEmitter();


  private _extantGroup: Group | undefined;
  private _initialized: boolean = false;

  @Input()
  set extantGroup(it: Group) {
    this._extantGroup = it;
    if (!!it && !this._initialized) {
      this.updateFormWithExtantData();
      this._initialized = true;
    }
  }

  get extantGroup() {
    return this._extantGroup
  }



  groupForm = new FormGroup({
    name: new FormControl('', [ Validators.required ]),
    icon: new FormControl('', [ Validators.required ]),
    representatives: new FormArray([]),
    districts: new FormArray([])
  });

  adminForm = new FormGroup({
    email: new FormControl('', [ Validators.required, Validators.pattern(EMAIL_REGEX) ])
  });

  hasDistricts: boolean = false;
  adminExtant: boolean = true;
  adminEmailQueryLoading: boolean = false;


  repSelectOptions: { id?: string, index: number, text: string }[] = [];



  @ViewChild('nameInput', { read: MdInputDirective }) nameInput: MdInputDirective;


  constructor(private cdr: ChangeDetectorRef) {

  }


  ngOnInit() {
    /*

        this.adminForm.controls[ 'email' ].valueChanges.subscribe(value => {
          this.adminEmailChanged.emit(value);
          this.adminEmailQueryLoading = true;
        });
    */

  }


  private updateFormWithExtantData() {
    this.groupForm.reset();
    this.groupForm.controls[ 'name' ].setValue(this.extantGroup.name);
    this.groupForm.controls[ 'icon' ].setValue(this.extantGroup.icon);


    if (this.extantGroup.representatives && this.extantGroup.representatives.length > 0) {

      this.repSelectOptions = [];

      for (let i = 0; i < this.representatives.length; i++) {
        this.representatives.removeAt(i);
      }

      this.extantGroup.representatives
        .sort((x, y) => x.title.localeCompare(y.title))
        .forEach(rep => {
          let form = this.addRep();
          form.controls[ 'firstName' ].setValue(rep.firstName);
          form.controls[ 'lastName' ].setValue(rep.lastName);
          form.controls[ 'icon' ].setValue(rep.icon);
          form.controls[ 'title' ].setValue(rep.title);
          form.controls[ 'email' ].disable();

          this.repSelectOptions.push({
            id: rep.id,
            index: this.representatives.length - 1,
            text: `${rep.firstName} ${rep.lastName}`
          })

        });
    }

    if (this.extantGroup.districts && this.extantGroup.districts.length > 0) {
      this.hasDistricts = true;

      for (let i = 0; i < this.districts.length; i++) {
        this.districts.removeAt(i);
      }

      this.extantGroup.districts.forEach(district => {
        let form = this.addDistrict();

        let reps = this.repSelectOptions.filter(it => it.id == district.representative);
        if (reps.length !== 1) {
          throw new Error(`Expected a single rep entry to match, found: ${JSON.stringify(reps)}`) //todo remove in production
        }

        form.controls[ 'name' ].setValue(district.name);
        form.controls[ 'representative' ].setValue(reps[ 0 ].index);
      });
    }

    this.cdr.detectChanges();
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

  get representatives(): FormArray {
    return this.groupForm.controls[ 'representatives' ] as FormArray;
  }

  /*  get repSelectOptions() {
      return this.representatives.controls.map((form: FormGroup, index) => {
        return {
          index,
          text: `${form.controls['firstName'].value } ${form.controls['lastName'].value}`
        }
      })
    }*/

  addDistrict(): FormGroup {
    this.districts.push(this.newDistrict());

    return this.districts.at(this.districts.length - 1) as FormGroup;



  };


  addRep(): FormGroup {
    this.representatives.push(this.newRep());
    let idx = this.representatives.length - 1;

    let it = this.representatives.at(idx) as FormGroup;

    this.repSelectOptions.push({
      index: idx,
      text: ''
    });

    Observable.combineLatest(it.controls[ 'firstName' ].valueChanges.startWith(''), it.controls[ 'lastName' ].valueChanges.startWith(''))
      .debounceTime(250)
      .subscribe(([ fname, lname ]) => {
        this.repSelectOptions[ idx ].text = `${fname} ${lname}`
      });

    return it;

  };

  private newRep(): FormGroup {
    return new FormGroup({
      firstName: new FormControl('', [ Validators.required ]),
      lastName: new FormControl('', [ Validators.required ]),
      email: new FormControl('', [ Validators.required, Validators.pattern(EMAIL_REGEX) ]),
      icon: new FormControl('', [ Validators.required ]),
      title: new FormControl('', [ Validators.required ])
    });
  }

  private newDistrict(): FormGroup {
    return new FormGroup({
      name: new FormControl('', [ Validators.required ]),
      representative: new FormControl('', [ Validators.required ])
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
