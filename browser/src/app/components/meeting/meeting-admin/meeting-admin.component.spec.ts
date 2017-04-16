import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingAdminComponent } from './meeting-admin.component';

describe('MeetingAdminComponent', () => {
    let component: MeetingAdminComponent;
    let fixture: ComponentFixture<MeetingAdminComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ MeetingAdminComponent ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MeetingAdminComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
