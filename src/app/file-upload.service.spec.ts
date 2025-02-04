import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { FileUploadService } from './file-upload.service';

describe('FileUploadService', () => {
  constructor(private http: HttpClient) { }

  let service: FileUploadService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileUploadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
