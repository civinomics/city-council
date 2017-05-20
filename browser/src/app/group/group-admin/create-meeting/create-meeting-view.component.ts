import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Group } from '../../group.model';
import { CreateItemComponent } from './create-item.component';
import { Meeting } from '../../../meeting/meeting.model';
import Moment = moment.Moment;

@Component({
  selector: 'civ-create-meeting-view',
  templateUrl: './create-meeting-view.component.html',
  styleUrls: [ './create-meeting-view.component.scss' ]
})
export class CreateMeetingViewComponent implements OnInit {

  @Input() group: Group;
  @Input() extantMeeting: Meeting | undefined;

  agenda: FormArray = new FormArray([]);

  form: FormGroup = new FormGroup({
    date: new FormControl('', [ Validators.required ]),
    startTime: new FormControl('', [ Validators.required ]),
    endTime: new FormControl(''),
    title: new FormControl('', [ Validators.required ]),
    agenda: this.agenda
  });


  constructor() { }

  ngOnInit() {

    if (!!this.extantMeeting) {

    } else {
      this.form.controls.title.setValue(`Regular Meeting of the ${this.group.name}`);


      this.addAgendaItem();
    }


    /* let now = moment().add(1, 'day');
     this.form.controls['date'].setValue(now.toDate());*/
  }

  addAgendaItem() {
    this.agenda.push(CreateItemComponent.build(this.agenda.length + 1));
  }

  removeItem(idx: number) {
    this.agenda.removeAt(idx);
    this.decrementItemNumbers();
  }

  decrementItemNumbers() {
    this.agenda.controls.forEach((control, idx) => {
      (control as FormGroup).controls[ 'itemNumber' ].setValue(idx + 1);
    });
  }


}
