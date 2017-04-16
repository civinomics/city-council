import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingAdminPageComponent } from './meeting-admin-page.component';

describe('MeetingAdminPageComponent', () => {
    let component: MeetingAdminPageComponent;
    let fixture: ComponentFixture<MeetingAdminPageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ MeetingAdminPageComponent ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MeetingAdminPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
