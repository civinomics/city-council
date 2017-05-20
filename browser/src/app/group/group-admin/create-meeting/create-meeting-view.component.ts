import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Group } from '../../group.model';
import { CreateItemComponent } from './create-item.component';
import { Meeting, MeetingCreateAdt } from '../../../meeting/meeting.model';
import Moment = moment.Moment;

@Component({
  selector: 'civ-create-meeting-view',
  templateUrl: './create-meeting-view.component.html',
  styleUrls: [ './create-meeting-view.component.scss' ]
})
export class CreateMeetingViewComponent implements OnInit {

  @Input() group: Group;
  @Input() extantMeeting: Meeting | undefined;
  @Output() submit: EventEmitter<MeetingCreateAdt> = new EventEmitter();

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
      this.form.controls.startTime.setValue('18:00');
      this.form.controls.endTime.setValue('20:00');


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

  private getDate() {
    return moment(this.form.controls[ 'date' ].value);
  }

  private getStartTime(): Moment {
    const TIME_ZONE = '-07:00'; //TODO get from model

    let date = this.getDate();
    let time = this.form.controls[ 'startTime' ].value.split(':').map(part => parseInt(part)),
      hours = time[ 0 ], minutes = time[ 1 ];

    return date.set('hours', hours).set('minutes', minutes).utcOffset(TIME_ZONE)

  }

  private getEndTime(): Moment {
    const TIME_ZONE = '-07:00'; //TODO get from model

    let date = this.getDate();
    let minutes, hours;

    if (this.form.controls[ 'endTime' ].value) {
      [ hours, minutes ] = this.form.controls[ 'endTime' ].value.split(':').map(part => parseInt(part));
    } else {
      [ hours, minutes ] = this.form.controls[ 'endTime' ].value.split(':').map(part => parseInt(part));
      hours += 2
    }

    return date.set('hours', hours).set('minutes', minutes).utcOffset(TIME_ZONE)

  }

  private getItem(form: FormGroup): { text: string, itemNumber: number, resourceLinks: string[] } {
    return {
      text: form.controls[ 'text' ].value,
      itemNumber: form.controls[ 'itemNumber' ].value,
      resourceLinks: (form.controls[ 'resourceLinks' ] as FormArray).controls.map(control => control.value)
    }
  }

  private prepareSubmission(): MeetingCreateAdt {
    return {
      title: this.form.controls[ 'title' ].value,
      groupId: this.group.id,
      startTime: this.getStartTime(),
      feedbackDeadline: this.getStartTime().subtract(1, 'day'),
      endTime: this.getEndTime(),
      agenda: this.agenda.controls.map(ctrl => this.getItem(ctrl as FormGroup))
    }
  }

  doSubmit() {
    if (this.form.valid) { // workaround material bug causing this method to fire when datepicker is opened (??)
      this.submit.emit(this.prepareSubmission());
    }
  }


}
