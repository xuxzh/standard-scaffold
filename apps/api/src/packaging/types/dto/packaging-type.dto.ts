import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PageQueryDto } from "@/common/dto/page-query.dto";

export class ListPackagingTypesQueryDto extends PageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  typeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  typeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRecyclable?: boolean;
}

export class CreatePackagingTypeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  typeCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  typeName!: string;

  @ApiProperty()
  @IsBoolean()
  isRecyclable!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}

export class UpdatePackagingTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  typeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecyclable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}

export type PackagingTypeDto = {
  id: number;
  typeCode: string;
  typeName: string;
  isRecyclable: boolean;
  description: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
};
