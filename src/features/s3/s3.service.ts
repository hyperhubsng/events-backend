import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, appConfig } from '@/config';
import { Injectable } from '@nestjs/common';
import { ErrorService } from '@/shared/errors/errors.service';

@Injectable()
export class S3Service {
  private awsBucket: string;
  private awsRegion : string 
  constructor(private readonly errorService: ErrorService) {
    this.awsBucket = appConfig.aws.bucketName; 
    this.awsRegion = appConfig.aws.region
  }

  /**
   * Adds a file to an AWS Bucket in a particular region
   * @param {String} fileName  name of the file
   * @param {Buffer} fileBody  The file as a Buffer
   * @returns {Object}
   */
  async putObject(
    fileName: string,
    fileBody: Buffer,
  ): Promise<string> {
 
    const params = {
      Bucket: this.awsBucket,
      Key: fileName,
      Body: fileBody,
    };

    try {
      await s3Client.send(new PutObjectCommand(params));
      return `https://${this.awsBucket}.s3.${this.awsRegion}.amazonaws.com/${fileName}`
    } catch (e) {
      return this.errorService.serviceError(e);
    }
  }
}
