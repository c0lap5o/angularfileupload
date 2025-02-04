import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fileOpen } from 'browser-fs-access';
import { directoryOpen, FileWithDirectoryAndFileHandle } from 'browser-fs-access';
import {HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';


interface FileNode {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: number;
  children?: FileNode[];
  originalFile?: File;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent {
  constructor(private http: HttpClient) {}

  fileTree: FileNode | null = null;
  message = '';
  isLoading = false;
  
 
  async selectFolder(){
    try{
      const files = await directoryOpen({
        recursive: true
      }) as FileWithDirectoryAndFileHandle[];//directoryOpen();
      if(files && files.length < 0){
        console.log("No Files Selected");
      }
      console.log(files);
      this.fileTree = await this.processFileList(files);
    }catch (error){
      console.error('Error Selecting Folder: ', error);
    }
  }
  private async processFileList(items: FileWithDirectoryAndFileHandle[]): Promise<FileNode> {
    const root: FileNode = { 
      name: 'root', 
      type: 'directory', 
      children: [] 
    };
  
    for (const item of items) {
      const pathParts = item.webkitRelativePath.split('/');
      let currentNode = root;
  
      // Create directory structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        let dirNode = currentNode.children!.find(
          node => node.name === part && node.type === 'directory'
        );
  
        if (!dirNode) {
          dirNode = { 
            name: part, 
            type: 'directory', 
            children: [] 
          };
          currentNode.children!.push(dirNode);
        }
        currentNode = dirNode;
      }
  
      // Add file to the last directory
      currentNode.children!.push({
        name: pathParts[pathParts.length - 1],
        type: 'file',
        size: item.size,
        lastModified: item.lastModified,
        originalFile: item
      });
    }
  
    return root;
  }
  
  
  private async processDirectory(dirHandle: FileSystemDirectoryHandle): Promise<FileNode> {
    const node: FileNode = { name: dirHandle.name, type: 'directory', children: [] };
    for await (const[name,entry] of (dirHandle as any).values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        node.children!.push({
          name: entry.name,
          type: 'file',
          size: file.size,
          lastModified: file.lastModified,
          originalFile: file
        });
      } else if (entry.kind === 'directory') {
        const childDirHandle = entry as FileSystemDirectoryHandle;
        node.children!.push(await this.processDirectory(childDirHandle));
      }
    }
    return node;
  }
    
  getTotalItems(node: FileNode): number {
    if (!node.children) return 0;
    
    return node.children.reduce((total, child) => {
      if (child.type === 'file') {
        return total + 1;
      } else if (child.type === 'directory' && child.children) {
        return total + 1 + this.getTotalItems(child);
      }
      return total;
    }, 0);
  }
  
  async uploadFiles(): Promise<void> {
    if (!this.fileTree) {
      this.message = 'Please select a folder first.';
      return;
    }
  
    try {
      const formData = new FormData();
  
      // Recursive function to collect files
      const collectFiles = async (node: FileNode) => {
        if (node.type === 'file' && node.originalFile) {
          formData.append('files', node.originalFile, node.name);
        }
        
        if (node.children) {
          for (const child of node.children) {
            await collectFiles(child);
          }
        }
      };
  
      // Collect all files
      await collectFiles(this.fileTree);
  
      // Append file tree as JSON
      formData.append('fileTree', JSON.stringify(this.fileTree));
  
      // Send POST request
      const response = await lastValueFrom(
        this.http.post('http://localhost:8080/api/upload', formData, {
          reportProgress: true,
          observe: 'response'
        })
      );
  
      // Handle successful upload
      this.message = 'Files uploaded successfully!';
      console.log('Upload response:', response);
    } catch (error) {
      console.error('Upload error:', error);
      this.message = 'Error uploading files.';
    }
  }

  clearSelection(): void {
    console.log('Clear selection called');
    this.fileTree = null;
    this.message = '';
  }
}
