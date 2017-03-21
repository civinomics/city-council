import * as moment from 'moment';
import { Place } from './place';
import { Group } from './group';
import Moment = moment.Moment;

export const SPLASH_DATA = {

  cities: [
    {
      id: 'id-austin',
      name: [ 'Austin', 'Texas', 'United States' ],
      flag: 'https://civinomics.com/images/Screen_Shot_2015-10-21_at_9.36.41_AM.png',

    }, {
      id: 'id-santa-cruz',
      name: [ 'Santa Cruz', 'California', 'United States' ],
      flag: 'https://civinomics.com/images/flags/country/united-states/states/california/counties/santa-cruz/cities/santa-cruz.gif'
    }
    , {
      id: 'id-las-vegas',
      name: [ 'Las Vegas', 'Nevada', 'United States' ],
      flag: 'http://www.crwflags.com/fotw/images/u/us-nv-lv.gif'
    }
  ]
};

const feedbackDeadline = moment('2017-03-27T06:00Z');

export const ACC_DATA: Group = {
  id: 'id-austin-cc',
  name: 'Austin City Council',
  icon: 'https://civinomics.com/images/Screen_Shot_2015-10-21_at_9.36.41_AM.png',
  owner: 'id-doug',
  editors: [ 'id-doug' ],
  districts: [],
  meetings: [
    {
      id: 'id-meeting-1',
      title: 'Regular Meeting of the Austin City Council',
      owner: 'id-doug',
      startTime: moment('2017-03-28T06:00Z'),
      endTime: moment('2017-03-28T08:00Z'),
      feedbackDeadline,
      status: 'open',
      items: [
        {
          id: 'id-item-1',
          owner: 'id-doug',
          text: 'Approve the minutes of the Austin City Council discussion of January 30, 2017, work session of January 31, 2017, budget work session of February 1, 2017, regular meeting of February 2, 2017, work session of February 14, 2017, budget work session of February 15, 2017, regular meeting of February 16, 2017, and special called meeting of February 22, 2017.',
          itemNumber: 1,
          meetingId: 'id-meeting-1',
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=66480',
          feedbackDeadline,
          activity: {
            votes: {
              total: 18,
              yes: 12,
              no: 6
            },
            comments: {
              total: 7
            }
          }
        },
        {
          id: 'id-item-2',
          owner: 'id-doug',
          text: 'Approve issuance of a rebate to Seton Family of Hospitals for installing energy efficiency measures at the Dell Seton Medical Center at The University of Texas, located at 1500 Red River Street, in an amount not to exceed $263,741. (District 1)',
          itemNumber: 2,
          meetingId: 'id-meeting-1',
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=68134',
          feedbackDeadline,
          activity: {
            votes: {
              total: 44,
              yes: 22,
              no: 22
            },
            comments: {
              total: 39
            }
          }
        },
        {
          id: 'id-item-3',
          owner: 'id-doug',
          text: 'Approve an ordinance amending the Fiscal Year 2016-2017 Austin Water Operating Budget (Ordinance No. 20160914-001) to increase the transfer in from the Capital Improvement Program by $1,836,000 and increase the transfer out by $7,000,000 for debt defeasance; and amending the Fiscal Year 2016-2017 Combined Utility Revenue Bond Redemption Fund (Ordinance No. 20160914-001) to increase the transfer in from the Austin Water Operating Budget by $22,000,000 and increase other operating requirement expenditures by $22,000,000 to fund debt defeasance. (Related to Item #10)',
          itemNumber: 3,
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=67717',
          meetingId: 'id-meeting-1',
          feedbackDeadline,
          activity: {
            votes: {
              total: 37,
              yes: 12,
              no: 25
            },
            comments: {
              total: 24
            }
          }
        },
        {
          id: 'id-item-4',
          owner: 'id-doug',
          text: 'Authorize negotiation and execution of a competitive sealed proposal agreement with MAC, INC. for the construction improvements to the Austin-Bergstrom International Airport Terminal Facility Upper Level Embankment Repairs project in an amount not to exceed $4,157,329.  (District 2)',
          itemNumber: 4,
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=68503',

          meetingId: 'id-meeting-1',
          feedbackDeadline,
          activity: {
            votes: {
              total: 8,
              yes: 4,
              no: 4
            },
            comments: {
              total: 2
            }
          }
        },
        {
          id: 'id-item-5',
          owner: 'id-doug',
          text: 'Authorize execution of change order #5 to the construction contract with MUNIZ CONCRETE & CONTRACTING, INC. for the Colorado Street Reconstruction and Utility Adjustments from 7th Street to 10th Street Rebid project in the amount of $358,634.53, for a total contract amount not to exceed $6,478,732.56. (District 9)',
          itemNumber: 5,
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=68012',
          meetingId: 'id-meeting-1',
          feedbackDeadline,
          activity: {
            votes: {
              total: 32,
              yes: 22,
              no: 10
            },
            comments: {
              total: 18
            }
          }
        }

      ],
    },
    {
      id: 'id-meeting-2',
      title: 'Regular Meeting of the Austin City Council',
      owner: 'id-doug',
      startTime: moment('2017-03-13T06:00Z'),
      endTime: moment('2017-03-13T08:00Z'),
      feedbackDeadline: moment('2017-03-12T06:00Z'),
      status: 'open',
      items: [
        {
          id: 'id-item-1',
          owner: 'id-doug',
          text: 'Approve the minutes of the Austin City Council discussion of January 30, 2017, work session of January 31, 2017, budget work session of February 1, 2017, regular meeting of February 2, 2017, work session of February 14, 2017, budget work session of February 15, 2017, regular meeting of February 16, 2017, and special called meeting of February 22, 2017.',
          itemNumber: 1,
          meetingId: 'id-meeting-1',
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=66480',
          feedbackDeadline: moment('2017-03-12T06:00Z'),
          activity: {
            votes: {
              total: 18,
              yes: 12,
              no: 6
            },
            comments: {
              total: 7
            }
          }
        },
        {
          id: 'id-item-2',
          owner: 'id-doug',
          text: 'Approve issuance of a rebate to Seton Family of Hospitals for installing energy efficiency measures at the Dell Seton Medical Center at The University of Texas, located at 1500 Red River Street, in an amount not to exceed $263,741. (District 1)',
          itemNumber: 2,
          meetingId: 'id-meeting-1',
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=68134',
          feedbackDeadline: moment('2017-03-12T06:00Z'),
          activity: {
            votes: {
              total: 44,
              yes: 22,
              no: 22
            },
            comments: {
              total: 39
            }
          }
        },
        {
          id: 'id-item-3',
          owner: 'id-doug',
          text: 'Approve an ordinance amending the Fiscal Year 2016-2017 Austin Water Operating Budget (Ordinance No. 20160914-001) to increase the transfer in from the Capital Improvement Program by $1,836,000 and increase the transfer out by $7,000,000 for debt defeasance; and amending the Fiscal Year 2016-2017 Combined Utility Revenue Bond Redemption Fund (Ordinance No. 20160914-001) to increase the transfer in from the Austin Water Operating Budget by $22,000,000 and increase other operating requirement expenditures by $22,000,000 to fund debt defeasance. (Related to Item #10)',
          itemNumber: 3,
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=67717',
          meetingId: 'id-meeting-1',
          feedbackDeadline: moment('2017-03-12T06:00Z'),
          activity: {
            votes: {
              total: 37,
              yes: 12,
              no: 25
            },
            comments: {
              total: 24
            }
          }
        },
        {
          id: 'id-item-4',
          owner: 'id-doug',
          text: 'Authorize negotiation and execution of a competitive sealed proposal agreement with MAC, INC. for the construction improvements to the Austin-Bergstrom International Airport Terminal Facility Upper Level Embankment Repairs project in an amount not to exceed $4,157,329.  (District 2)',
          itemNumber: 4,
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=68503',

          meetingId: 'id-meeting-1',
          feedbackDeadline: moment('2017-03-12T06:00Z'),
          activity: {
            votes: {
              total: 8,
              yes: 4,
              no: 4
            },
            comments: {
              total: 2
            }
          }
        },
        {
          id: 'id-item-5',
          owner: 'id-doug',
          text: 'Authorize execution of change order #5 to the construction contract with MUNIZ CONCRETE & CONTRACTING, INC. for the Colorado Street Reconstruction and Utility Adjustments from 7th Street to 10th Street Rebid project in the amount of $358,634.53, for a total contract amount not to exceed $6,478,732.56. (District 9)',
          itemNumber: 5,
          sireLink: 'https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=68012',
          meetingId: 'id-meeting-1',
          feedbackDeadline: moment('2017-03-12T06:00Z'),
          activity: {
            votes: {
              total: 32,
              yes: 22,
              no: 10
            },
            comments: {
              total: 18
            }
          }
        }

      ],
    }

  ]


};

export const AUSTIN_DATA: Place = {
  id: 'id-austin',
  name: 'Austin',
  longName: 'City of Austin',
  icon: 'https://civinomics.com/images/Screen_Shot_2015-10-21_at_9.36.41_AM.png',
  owner: 'id-doug',

  groups: [ ACC_DATA ]

};

