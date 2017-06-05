import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ValidEmailAddress } from '../../shared/constants';
import { MdInputDirective } from '@angular/material';
import { User } from '../../user/user.model';
import { District, Group, GroupCreateInput, Representative, RepresentativeCreateInput } from '../../group/group.model';
import { Observable } from 'rxjs/Observable';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'civ-group-edit-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-edit-view.component.html',
  styleUrls: [ './group-edit-view.component.scss' ],
  animations: [
    trigger('saveBtn', [
      transition(':enter', [
        style({ transform: 'translateY(20vh)scale(0)' }),
        animate('300ms ease-in', style({ transform: 'translateY(0)scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'scale(0)', opacity: 0 }))
      ])
    ])
  ]
})
export class GroupEditViewComponent implements OnInit, AfterContentInit {

  @Input() adminSearchResult: User | null;
  @Input() error: string;
  @Output() adminEmailChanged: EventEmitter<string> = new EventEmitter();
  @Output() submit: EventEmitter<GroupCreateInput> = new EventEmitter();

  @Input() savePending: boolean;

  private _nextId: number = 0;

  private _extantGroup: Group | undefined;
  private _repMap: { [id: string]: Partial<Representative> } = {};
  private _distMap: { [id: string]: District } = {};
  private _initialized: boolean = false;


  @Input()
  set extantGroup(it: Group) {
    this._extantGroup = it;
    this._repMap = (this._extantGroup.representatives || []).reduce((result, rep) => ({
      ...result,
      [rep.id]: rep
    }), {});
    this._distMap = (this._extantGroup.districts || []).reduce((result, dist) => ({ ...result, [dist.id]: dist }), {});
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
    email: new FormControl('', [ Validators.required, ValidEmailAddress ])
  });

  hasDistricts: boolean = false;
  adminExtant: boolean = true;
  adminEmailQueryLoading: boolean = false;


  repSelectOptions: { id: string, text: string }[] = [];



  @ViewChild('nameInput', { read: MdInputDirective }) nameInput: MdInputDirective;


  constructor(private cdr: ChangeDetectorRef) {

  }


  ngOnInit() {

        this.adminForm.controls[ 'email' ].valueChanges.subscribe(value => {
          this.adminEmailChanged.emit(value);
          this.adminEmailQueryLoading = true;
        });

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
        .forEach(rep =>
          this.addRep(rep)
        );
    }

    if (this.extantGroup.districts && this.extantGroup.districts.length > 0) {
      this.hasDistricts = true;

      for (let i = 0; i < this.districts.length; i++) {
        this.districts.removeAt(i);
      }

      this.extantGroup.districts.forEach(district => {
        this.addDistrict(district);
      });
    }

    this.cdr.detectChanges();
  }

  repHasChanges(): boolean {

    return false
  }

  hasChanges(): boolean {
    if (!this.extantGroup) {
      return false;
    }
    if (
      this.groupForm.controls[ 'name' ].value != this.extantGroup.name ||
      this.groupForm.controls[ 'icon' ].value != this.extantGroup.icon
    ) {
      return true;
    }

    if (this.representatives.length !== this.extantGroup.representatives.length) {
      return true;
    }

    for (let i = 0; i < this.representatives.length; i++) {
      let form = this.representatives.at(i) as FormGroup,
        data = this._repMap[ form.controls[ 'id' ].value ];

      if (!data) {
        debugger;
      }

      if (
        form.controls[ 'firstName' ].value != data.firstName ||
        form.controls[ 'lastName' ].value != data.lastName ||
        form.controls[ 'icon' ].value != data.icon ||
        form.controls[ 'title' ].value != data.title
      ) {
        return true;
      }

    }


    if (this.districts.length !== this.extantGroup.districts.length) {
      return true;
    }

    for (let i = 0; i < this.districts.length; i++) {
      let form = this.districts.at(i) as FormGroup,
        data = this._distMap[ form.controls[ 'id' ].value ];

      if (!data) {
        debugger;
      }
      if (
        form.controls[ 'name' ].value != data.name ||
        form.controls[ 'representative' ].value != data.representative
      ) {
        return true;
      }
    }

    return false;

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

  addDistrict(dist?: District): FormGroup {
    const form = this.newDistrict(dist);
    const id = form.controls[ 'id' ].value;
    const name = form.controls[ 'name' ].value;
    const representative = form.controls[ 'representative' ].value;

    this._distMap[ id ] = this.parseDistrictFromForm(form);

    this.districts.push(form);
    return form

  };


  addRep(rep?: Representative): FormGroup {
    const it = this.newRep(rep);
    const id = it.controls[ 'id' ].value;
    const text = `${it.controls[ 'firstName' ].value} ${it.controls[ 'lastName' ].value}`;

    this.representatives.push(it);
    let idx = this.representatives.length - 1;

    this.repSelectOptions.push({
      id,
      text
    });

    Observable.combineLatest(
      it.controls[ 'firstName' ].valueChanges.startWith(rep && rep.firstName || ''),
      it.controls[ 'lastName' ].valueChanges.startWith(rep && rep.lastName || '')
    )
      .debounceTime(250)
      .subscribe(([ fname, lname ]) => {
        this.repSelectOptions[ idx ].text = `${fname} ${lname}`
      });


    return it;

  };

  private newRep(rep?: Representative): FormGroup {
    return new FormGroup({
      firstName: new FormControl(rep && rep.firstName || '', [ Validators.required ]),
      lastName: new FormControl(rep && rep.lastName || '', [ Validators.required ]),
      email: new FormControl(rep && rep.email || '', [ Validators.required, ValidEmailAddress ]),
      icon: new FormControl(rep && rep.icon || '', [ Validators.required ]),
      title: new FormControl(rep && rep.title || '', [ Validators.required ]),
      id: new FormControl(rep && rep.id || `temp_district_id_${++this._nextId}`),
      district: new FormControl(rep && rep.district || undefined)
    });
  }

  private newDistrict(district?: District): FormGroup {
    return new FormGroup({
      name: new FormControl(district && district.name || '', [ Validators.required ]),
      representative: new FormControl(district && district.representative || '', [ Validators.required ]),
      id: new FormControl(district && district.id || `temp_district_id_${++this._nextId}`)
    });
  }

  private parseDistrictFromForm(form: FormGroup): District {
    return {
      id: form.controls[ 'id' ].value,
      name: form.controls[ 'name' ].value,
      representative: form.controls[ 'representative' ].value
    }
  }

  private parseRepFromForm(form: FormGroup): RepresentativeCreateInput {
    return {
      firstName: form.controls[ 'firstName' ].value,
      lastName: form.controls[ 'lastName' ].value,
      icon: form.controls[ 'icon' ].value,
      email: form.controls[ 'email' ].value,
      title: form.controls[ 'title' ].value,
      id: form.controls[ 'id' ].value,
    }
  }

  private parseGroupFromForm(): GroupCreateInput {
    return {
      name: this.groupForm.controls[ 'name' ].value,
      icon: this.groupForm.controls[ 'icon' ].value,
      districts: this.districts.controls.map((form: FormGroup) => this.parseDistrictFromForm(form)),
      representatives: this.representatives.controls.map((form: FormGroup) => this.parseRepFromForm(form)),
      adminId: this.adminSearchResult.id
    };
  }

  doSubmit() {
    let data = this.parseGroupFromForm();

    this.submit.emit(data);

  }


  removeRep(idx: number) {
    let removeId = (this.representatives.at(idx) as FormGroup).controls[ 'id' ].value;
    this.repSelectOptions = this.repSelectOptions.filter(it => it.id !== removeId);
    this._repMap = Object.keys(this._repMap)
      .filter(id => id !== removeId)
      .reduce((result, id) => ({ ...result, [id]: this._repMap[ id ] }), {});
    this.representatives.removeAt(idx);
  }

  removeDistrict(idx: number) {
    let removeId = (this.districts.at(idx) as FormGroup).controls[ 'id' ].value;

    //remove district from corresponding representative, if any
    if (this._distMap[ removeId ].representative) {
      let forms = this.representatives.controls
        .filter((form: FormGroup) => form.controls[ 'id' ].value == this._distMap[ removeId ].representative);

      if (forms.length !== 1) {
        console.error(`Could not find representative for removed district`);
      } else {
        let form = forms[ 0 ] as FormGroup;
        form.controls[ 'district' ].setValue(undefined);
      }
    }

    this._distMap = Object.keys(this._distMap)
      .filter(id => id !== removeId)
      .reduce((result, id) => ({ ...result, [id]: this._distMap[ id ] }), {});

    this.districts.removeAt(idx);

  }
}
