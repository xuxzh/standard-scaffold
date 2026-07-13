import { IsString, Matches, MaxLength } from "class-validator";

export class StartAiRunDto {
  @IsString()
  @Matches(/\S/, { message: "content must contain a non-whitespace character" })
  @MaxLength(8_000)
  content!: string;
}
