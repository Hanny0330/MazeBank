import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingProfileComponent } from './loading-profile';

describe('LoadingProfileComponent', () => {
  let component: LoadingProfileComponent;
  let fixture: ComponentFixture<LoadingProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
