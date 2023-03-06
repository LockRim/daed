import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
} from "@chakra-ui/react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

export default <FormValues extends Record<string, unknown>>({
  isOpen,
  onClose,
  form,
  onSubmit,
  header,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: UseFormReturn<FormValues>;
  onSubmit: (form: UseFormReturn<FormValues>) => Promise<void>;
  header: React.ReactNode;
  children: React.ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <form
        onSubmit={form.handleSubmit(async () => {
          try {
            await onSubmit(form);
            form.reset();
          } catch {
            //
          }
        })}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{header}</DrawerHeader>
          <DrawerBody overflow="hidden">{children}</DrawerBody>
          <DrawerFooter>
            <Flex gap={2}>
              <Button onClick={onClose}>{t("cancel")}</Button>

              <Button type="submit" isLoading={form.formState.isSubmitting} bg="Highlight">
                {t("confirm")}
              </Button>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </form>
    </Drawer>
  );
};