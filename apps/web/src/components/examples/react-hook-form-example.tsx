import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea
} from "@/components/ui/input-group";
import { notify } from "@/lib/notify";

const formSchema = z.object({
  title: z
    .string()
    .min(5, "标题至少需要 5 个字符。")
    .max(32, "标题最多 32 个字符。"),
  description: z
    .string()
    .min(20, "描述至少需要 20 个字符。")
    .max(100, "描述最多 100 个字符。")
});

type FormValues = z.infer<typeof formSchema>;

export function ReactHookFormExample() {
  const [submittedValues, setSubmittedValues] = useState<FormValues | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: ""
    }
  });

  function onSubmit(values: FormValues) {
    setSubmittedValues(values);
    notify.success("表单已提交");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>React Hook Form 示例</CardTitle>
        <CardDescription>
          使用 shadcn Field、React Hook Form 和 Zod 组织可复用表单。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="react-hook-form-example" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="react-hook-form-example-title">标题</FieldLabel>
                  <Input
                    {...field}
                    id="react-hook-form-example-title"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    placeholder="移动端登录按钮无响应"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="react-hook-form-example-description">描述</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      {...field}
                      id="react-hook-form-example-description"
                      aria-invalid={fieldState.invalid}
                      className="min-h-24"
                      placeholder="说明复现步骤、期望行为和实际行为。"
                      rows={5}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {field.value.length}/100
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    描述建议包含触发条件、用户操作和当前结果。
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        {submittedValues ? (
          <div className="mt-6 flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">表单已提交</p>
            <p className="text-muted-foreground">{submittedValues.title}</p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="gap-3">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          <RotateCcwIcon data-icon="inline-start" />
          重置
        </Button>
        <Button type="submit" form="react-hook-form-example">
          <CheckIcon data-icon="inline-start" />
          提交
        </Button>
      </CardFooter>
    </Card>
  );
}
