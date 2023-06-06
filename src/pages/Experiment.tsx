import { DndContext, DragOverlay, UniqueIdentifier, useDraggable } from '@dnd-kit/core'
import { restrictToFirstScrollableAncestor, restrictToParentElement } from '@dnd-kit/modifiers'
import { SortableContext, rectSwappingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { faker } from '@faker-js/faker'
import {
  Accordion,
  ActionIcon,
  Badge,
  Card,
  Group,
  HoverCard,
  SimpleGrid,
  Space,
  Stack,
  Text,
  Title,
  createStyles,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { produce } from 'immer'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useImportNodesMutation, useImportSubscriptionsMutation } from '~/apis'
import { CreateConfigFormModal } from '~/components/CreateConfigFormModal'
import { CreateGroupFormModal } from '~/components/CreateGroupFormModal'
import { DroppableGroupCard } from '~/components/DroppableGroupCard'
import { ImportResourceFormModal } from '~/components/ImportNodeFormModal'
import { Policy } from '~/schemas/gql/graphql'

enum ResourceType {
  node,
  subscription,
}

const useStyles = createStyles((theme) => ({
  section: {
    border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[2]}`,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    boxShadow: theme.shadows.md,
  },
}))

const SortableNodeBadge = ({ id, name, onRemove }: { id: string; name: string; onRemove: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <Badge
      ref={setNodeRef}
      pr={3}
      rightSection={
        <ActionIcon color="blue" size="xs" radius="xl" variant="transparent" onClick={onRemove}>
          <IconX size={12} />
        </ActionIcon>
      }
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
      }}
    >
      <Text {...listeners} {...attributes}>
        {name}
      </Text>
    </Badge>
  )
}

const DraggableResourceCard = ({
  id,
  type,
  name,
  onRemove,
  children,
}: {
  id: string
  type: ResourceType
  name: string
  onRemove: () => void
  children: React.ReactNode
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { type } })

  return (
    <Card
      ref={setNodeRef}
      p="sm"
      withBorder
      shadow="sm"
      style={{
        opacity: isDragging ? 0.5 : undefined,
      }}
    >
      <Card.Section withBorder p="sm">
        <Group position="apart">
          <Badge
            size="lg"
            style={{
              cursor: 'grab',
            }}
            {...listeners}
            {...attributes}
          >
            {name}
          </Badge>

          <ActionIcon
            color="red"
            size="xs"
            onClick={() => {
              modals.openConfirmModal({
                title: 'Remove',
                labels: {
                  cancel: 'No',
                  confirm: "Yes, I'm sure",
                },
                children: 'Are you sure you want to remove this?',
                onConfirm: onRemove,
              })
            }}
          >
            <IconTrash />
          </ActionIcon>
        </Group>
      </Card.Section>

      <Card.Section p="sm">{children}</Card.Section>
    </Card>
  )
}

const Section = ({
  title,
  bordered,
  onCreate,
  children,
}: {
  title: string
  bordered?: boolean
  onCreate: () => void
  children: React.ReactNode
}) => {
  const { classes, theme, cx } = useStyles()

  return (
    <Stack className={cx({ [classes.section]: bordered })}>
      <Group position="apart">
        <Title order={3} color={theme.primaryColor}>
          {title}
        </Title>

        <ActionIcon onClick={onCreate}>
          <IconPlus />
        </ActionIcon>
      </Group>

      {children}
    </Stack>
  )
}

export const ExperimentPage = () => {
  const { classes, theme } = useStyles()
  const { t } = useTranslation()

  const [fakeConfigs, setFakeConfigs] = useState(
    faker.helpers.multiple(
      () => ({
        id: faker.string.uuid(),
        name: faker.lorem.word(),
      }),
      {
        count: 4,
      }
    )
  )

  const [fakeGroups, setFakeGroups] = useState(
    faker.helpers.multiple(
      () => ({
        id: faker.string.uuid(),
        name: faker.lorem.word(),
        nodes: faker.helpers.multiple(
          () => ({
            id: faker.string.uuid(),
            name: faker.lorem.word(),
          }),
          {
            count: faker.number.int({ min: 5, max: 10 }),
          }
        ),
        subscriptions: faker.helpers.multiple(
          () => ({
            id: faker.string.uuid(),
            name: faker.lorem.word(),
          }),
          {
            count: 5,
          }
        ),
        policy: faker.helpers.enumValue(Policy),
      }),
      {
        count: 4,
      }
    )
  )

  const [fakeNodes, setFakeNodes] = useState(
    faker.helpers.multiple(
      () => ({
        id: faker.string.uuid(),
        name: faker.lorem.word(),
        protocol: faker.helpers.arrayElement([
          'vmess',
          'vless',
          'shadowsocks',
          'trojan',
          'hysteria',
          'socks5',
          'direct',
          'http',
        ]),
        tag: faker.lorem.word(),
        link: faker.internet.url(),
      }),
      {
        count: 5,
      }
    )
  )

  const [fakeSubscriptions, setFakeSubscriptions] = useState(
    faker.helpers.multiple(
      () => ({
        id: faker.string.uuid(),
        name: faker.lorem.word(),
        tag: faker.lorem.word(),
        link: faker.internet.url(),
        updatedAt: dayjs(faker.date.recent()).format('YYYY-MM-DD HH:mm:ss'),
      }),
      {
        count: 5,
      }
    )
  )

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeType, setActiveType] = useState<ResourceType | null>(null)

  const [openedCreateConfigModal, { open: openCreateConfigModal, close: closeCreateConfigModal }] = useDisclosure(false)
  const [openedCreateGroupModal, { open: openCreateGroupModal, close: closeCreateGroupModal }] = useDisclosure(false)
  const [openedImportNodeModal, { open: openImportNodeModal, close: closeImportNodeModal }] = useDisclosure(false)
  const [openedImportSubscriptionModal, { open: openImportSubscriptionModal, close: closeImportSubscriptionModal }] =
    useDisclosure(false)

  const importNodesMutation = useImportNodesMutation()
  const importSubscriptionsMutation = useImportSubscriptionsMutation()

  return (
    <Stack>
      <Section title={t('config')} onCreate={openCreateConfigModal}>
        <SimpleGrid cols={4}>
          {fakeConfigs.map(({ id: configId, name }) => (
            <Card key={configId} withBorder shadow="sm">
              <Card.Section withBorder inheritPadding py="sm">
                <Group position="apart">
                  <Title order={4}>{name}</Title>

                  <Group>
                    <ActionIcon
                      color="red"
                      size="xs"
                      onClick={() => {
                        modals.openConfirmModal({
                          title: 'Remove',
                          labels: {
                            cancel: 'No',
                            confirm: "Yes, I'm sure",
                          },
                          children: 'Are you sure you want to remove this?',
                          onConfirm: () =>
                            setFakeConfigs((configs) => configs.filter((config) => config.id !== configId)),
                        })
                      }}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card.Section>
            </Card>
          ))}
        </SimpleGrid>
      </Section>

      <Space />

      <SimpleGrid cols={3}>
        <DndContext
          modifiers={[restrictToFirstScrollableAncestor]}
          onDragStart={(e) => {
            setActiveId(e.active.id)
            setActiveType(
              (
                e.active.data.current as {
                  type: ResourceType
                }
              ).type
            )
          }}
          onDragEnd={(e) => {
            const { active, over } = e

            if (activeType === ResourceType.node) {
              const activeNode = fakeNodes.find((node) => node.id === active.id)

              if (activeNode) {
                const updatedFakeGrups = produce(fakeGroups, (groups) => {
                  const group = groups.find((group) => group.id === over?.id)

                  if (!group?.nodes.find((node) => node.id === active.id)) {
                    group?.nodes.push(activeNode)
                  }
                })

                setFakeGroups(updatedFakeGrups)
              }
            }

            if (activeType === ResourceType.subscription) {
              const activeSubscription = fakeSubscriptions.find((subscription) => subscription.id === active.id)

              if (activeSubscription) {
                const updatedFakeGrups = produce(fakeGroups, (groups) => {
                  const group = groups.find((group) => group.id === over?.id)

                  if (!group?.subscriptions.find((subscription) => subscription.id === active.id)) {
                    group?.subscriptions.push(activeSubscription)
                  }
                })

                setFakeGroups(updatedFakeGrups)
              }
            }

            setActiveId(null)
            setActiveType(null)
          }}
        >
          <Section title={t('group')} onCreate={openCreateGroupModal} bordered>
            <Stack>
              {fakeGroups.map(({ id: groupId, name, policy, nodes, subscriptions }) => (
                <DroppableGroupCard
                  key={groupId}
                  id={groupId}
                  name={name}
                  onRemove={() => {
                    setFakeGroups((groups) => groups.filter((group) => group.id !== groupId))
                  }}
                >
                  <Text fw={600} color={theme.primaryColor}>
                    {policy}
                  </Text>

                  <Space h={10} />

                  <Accordion variant="filled" defaultValue={[]} multiple>
                    <Accordion.Item value="node">
                      <Accordion.Control fz="xs" px="xs">
                        {t('node')}
                      </Accordion.Control>

                      <Accordion.Panel>
                        <SimpleGrid cols={2}>
                          <DndContext modifiers={[restrictToParentElement]}>
                            <SortableContext items={nodes} strategy={rectSwappingStrategy}>
                              {nodes.map(({ id: nodeId, name }) => (
                                <SortableNodeBadge
                                  key={nodeId}
                                  id={nodeId}
                                  name={name}
                                  onRemove={() => {
                                    const updatedFakeGrups = produce(fakeGroups, (groups) => {
                                      const group = groups.find((group) => group.id === groupId)

                                      if (group) {
                                        group.nodes = group.nodes.filter((node) => node.id !== nodeId)
                                      }
                                    })

                                    setFakeGroups(updatedFakeGrups)
                                  }}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        </SimpleGrid>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="subscription">
                      <Accordion.Control fz="xs" px="xs">
                        {t('subscription')}
                      </Accordion.Control>

                      <Accordion.Panel>
                        <SimpleGrid cols={2}>
                          <DndContext modifiers={[restrictToParentElement]}>
                            <SortableContext items={subscriptions} strategy={rectSwappingStrategy}>
                              {subscriptions.map(({ id: subscriptionId, name }) => (
                                <SortableNodeBadge
                                  key={subscriptionId}
                                  id={subscriptionId}
                                  name={name}
                                  onRemove={() => {
                                    const updatedFakeGrups = produce(fakeGroups, (groups) => {
                                      const group = groups.find((group) => group.id === groupId)

                                      if (group) {
                                        group.subscriptions = group.subscriptions.filter(
                                          (subscription) => subscription.id !== subscriptionId
                                        )
                                      }
                                    })

                                    setFakeGroups(updatedFakeGrups)
                                  }}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        </SimpleGrid>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                </DroppableGroupCard>
              ))}
            </Stack>
          </Section>

          <Section title={t('node')} onCreate={openImportNodeModal} bordered>
            <Stack>
              {fakeNodes.map(({ id, name, tag, protocol, link }) => (
                <DraggableResourceCard
                  key={id}
                  id={id}
                  type={ResourceType.node}
                  name={name}
                  onRemove={() => {
                    setFakeNodes((nodes) => nodes.filter((node) => node.id !== id))
                  }}
                >
                  <Text fw={600} color={theme.primaryColor}>
                    {tag}
                  </Text>
                  <Text fw={600}>{protocol}</Text>
                  <HoverCard withArrow>
                    <HoverCard.Target>
                      <Text truncate>{link}</Text>
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Text>{link}</Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </DraggableResourceCard>
              ))}
            </Stack>
          </Section>

          <Section title={t('subscription')} onCreate={openImportSubscriptionModal} bordered>
            <Stack>
              {fakeSubscriptions.map(({ id, name, tag, link, updatedAt }) => (
                <DraggableResourceCard
                  key={id}
                  id={id}
                  type={ResourceType.subscription}
                  name={name}
                  onRemove={() => {
                    setFakeSubscriptions((subscriptions) =>
                      subscriptions.filter((subscription) => subscription.id !== id)
                    )
                  }}
                >
                  <Text fw={600} color={theme.primaryColor}>
                    {tag}
                  </Text>
                  <Text fw={600}>{updatedAt}</Text>
                  <HoverCard withArrow>
                    <HoverCard.Target>
                      <Text truncate>{link}</Text>
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Text>{link}</Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </DraggableResourceCard>
              ))}
            </Stack>
          </Section>

          <DragOverlay dropAnimation={null}>
            {activeId ? <Badge>{fakeNodes.find((node) => node.id === activeId)?.name}</Badge> : null}
          </DragOverlay>
        </DndContext>

        <CreateConfigFormModal opened={openedCreateConfigModal} onClose={closeCreateConfigModal} />
        <CreateGroupFormModal opened={openedCreateGroupModal} onClose={closeCreateGroupModal} />
        <ImportResourceFormModal
          title={t('node')}
          opened={openedImportNodeModal}
          onClose={closeImportNodeModal}
          handleSubmit={async (values) => {
            await importNodesMutation.mutateAsync(values.resources.map(({ link, tag }) => ({ link, tag })))
            closeImportNodeModal()
          }}
        />

        <ImportResourceFormModal
          title={t('subscription')}
          opened={openedImportSubscriptionModal}
          onClose={closeImportSubscriptionModal}
          handleSubmit={async (values) => {
            await importSubscriptionsMutation.mutateAsync(values.resources.map(({ link, tag }) => ({ link, tag })))
            closeImportNodeModal()
          }}
        />
      </SimpleGrid>
    </Stack>
  )
}