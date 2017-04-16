import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupMeetingsView } from './group-meetings.view';

describe('GroupMeetingsView', () => {
    let component: GroupMeetingsView;
    let fixture: ComponentFixture<GroupMeetingsView>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ GroupMeetingsView ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupMeetingsView);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
