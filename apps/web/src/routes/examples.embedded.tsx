import { SendIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("examples");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("embedded.title")}</CardTitle>
          <CardDescription>{t("embedded.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend>{t("embedded.quickSetup")}</FieldLegend>
            <FieldDescription>{t("embedded.quickSetupDescription")}</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="workspace-name">{t("embedded.workspaceName")}</FieldLabel>
                <Input id="workspace-name" defaultValue="Ruihui Console" />
              </Field>
              <Field>
                <FieldLabel htmlFor="owner-email">{t("embedded.ownerEmail")}</FieldLabel>
                <Input id="owner-email" type="email" defaultValue="team@ruihui.dev" />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
        <CardFooter>
          <Button>
            <SendIcon data-icon="inline-start" />
            {t("embedded.saveDraft")}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("embedded.layoutNotes")}</CardTitle>
          <CardDescription>{t("embedded.layoutNotesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>{t("embedded.noteOne")}</p>
          <p>{t("embedded.noteTwo")}</p>
          <p>{t("embedded.noteThree")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
