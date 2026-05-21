import { SendIcon } from "lucide-react";
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
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function EmbeddedExamplePage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Embedded Example</CardTitle>
          <CardDescription>
            这个页面运行在后台壳内，适合放业务表单、列表和看板。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend>Quick Setup</FieldLegend>
            <FieldDescription>演示 `FieldGroup + Field` 的后台表单布局。</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="workspace-name">Workspace Name</FieldLabel>
                <Input id="workspace-name" defaultValue="Ruihui Console" />
              </Field>
              <Field>
                <FieldLabel htmlFor="owner-email">Owner Email</FieldLabel>
                <Input id="owner-email" type="email" defaultValue="team@ruihui.dev" />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
        <CardFooter>
          <Button>
            <SendIcon data-icon="inline-start" />
            Save Draft
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Layout Notes</CardTitle>
          <CardDescription>这部分用于说明后台壳与内容区的职责边界。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>导航和全局动作放在壳层，页面只负责业务内容。</p>
          <p>后续可以继续接表格、图表、权限或真实数据，而不需要重做路由骨架。</p>
          <p>如果某个示例需要全屏展示，则可以直接走独立路由模式。</p>
        </CardContent>
      </Card>
    </div>
  );
}
