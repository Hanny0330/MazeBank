import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HazIniciadoComponent } from './haz-iniciado';

describe('HazIniciadoComponent', () => {
  let component: HazIniciadoComponent;
  let fixture: ComponentFixture<HazIniciadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HazIniciadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HazIniciadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
