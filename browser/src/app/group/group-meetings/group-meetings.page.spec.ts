import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupMeetingsPage } from './group-meetings.page';

describe('GroupMeetingsPage', () => {
    let component: GroupMeetingsPage;
    let fixture: ComponentFixture<GroupMeetingsPage>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ GroupMeetingsPage ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupMeetingsPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
