import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingAdminPage } from './meeting-admin.page';

describe('MeetingAdminPage', () => {
    let component: MeetingAdminPage;
    let fixture: ComponentFixture<MeetingAdminPage>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ MeetingAdminPage ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MeetingAdminPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
