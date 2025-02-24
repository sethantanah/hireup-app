import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatesManagerComponent } from './templates-manager.component';

describe('TemplatesManagerComponent', () => {
  let component: TemplatesManagerComponent;
  let fixture: ComponentFixture<TemplatesManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplatesManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplatesManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
