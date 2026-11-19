import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Grid, GridCol, Stack } from "./grid"

const meta = { title: "UI/Grid", component: Grid, parameters: { layout: "padded" } } satisfies Meta<typeof Grid>
export default meta
type Story = StoryObj<typeof meta>

const Box = ({ children }: { children: string }) => <div className="rounded-lg border border-border bg-stone p-4 text-base text-navy">{children}</div>

/** One column on a phone, 8 and 4 of 12 from a laptop, the gap from the 8-point scale. */
export const TwoColumns: Story = {
  render: () => (
    <Grid cols={{ base: 1, lg: 12 }} gap="lg">
      <GridCol span={{ base: "full", lg: 8 }}>
        <Stack gap="lg">
          <Box>Next visit</Box>
          <Box>Invoice</Box>
        </Stack>
      </GridCol>
      <GridCol span={{ base: "full", lg: 4 }}>
        <Box>Season Pass</Box>
      </GridCol>
    </Grid>
  ),
}
