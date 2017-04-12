import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Meeting, MeetingStatsAdt} from '../../../models/meeting';
import {MeetingService} from '../../../services/meeting.service';
import {Office} from '../../../models/office';

@Component({
  selector: 'civ-meeting-stats-view',
  templateUrl: './meeting-stats.component.html',
  styleUrls: ['./meeting-stats.component.scss']
})
export class MeetingStatsComponent implements OnChanges {


  @Input() meeting: Meeting;

  @Input() districts: Office[];

  @Input() stats: MeetingStatsAdt;

  data: {
    numItems: number;
    totComments: number;
    totVotes: number;
    totParticipants: number;
    participationByDistrict: { name: string, value: number }[]
  };

  labelFunction = (name: string) => {
    return name.split(' ')[1];
  };

  colorScheme = {
    domain: ['#F44336', '#673AB7', '#03A9F4', '#4CAF50', '#FF5722', '#607D8B', '#9C27B0', '#3F51B5', '#009688', '#8BC34A', '#CDDC39', '#795548']
  };

  constructor(private meetingSvc: MeetingService) {
  }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!!changes['stats'] && !!changes['stats'].currentValue) {
      this.updateData();
    }
  }

  updateData() {
    let numItems = this.meeting.agendaIds.length;
    let participationByDistrict = this.districts.map(district => ({
      name: district.name,
      value: this.stats.total.byDistrict[district.id].participants
    }));

    let totParticipants = this.stats.total.participants;
    let totComments = this.stats.total.comments;
    let totVotes = this.stats.total.votes;

    this.data = {
      numItems,
      totComments,
      totVotes,
      totParticipants,
      participationByDistrict
    }
  }


}
