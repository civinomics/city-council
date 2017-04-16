import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DistrictInputTableComponent } from './district-input-table.component';

describe('DistrictInputTableComponent', () => {
    let component: DistrictInputTableComponent;
    let fixture: ComponentFixture<DistrictInputTableComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DistrictInputTableComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DistrictInputTableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
