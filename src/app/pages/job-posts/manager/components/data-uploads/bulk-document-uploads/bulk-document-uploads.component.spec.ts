import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkDocumentUploadsComponent } from './bulk-document-uploads.component';

describe('BulkDocumentUploadsComponent', () => {
  let component: BulkDocumentUploadsComponent;
  let fixture: ComponentFixture<BulkDocumentUploadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkDocumentUploadsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BulkDocumentUploadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
