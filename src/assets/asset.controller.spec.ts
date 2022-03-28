/* eslint @typescript-eslint/no-unsafe-return: 0 */
/* eslint @typescript-eslint/no-floating-promises: 0 */
import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { Logger } from '../shared/logger/logger.service';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { Asset } from './asset.entity';
import { ElasticService } from '../shared/elasticsearch/elastic.service';

describe('Asset', () => {
  let assetController: AssetController;
  let assetService: AssetService;

  const asset = new Asset();
  asset.id = `did:nv:${faker.datatype.uuid()}`;
  asset['@context'] = 'https://w3id.org/did/v1';
  asset.created = new Date().toDateString();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AssetController],
      providers: [
        {
          provide: ElasticService,
          useValue: {
            addDocumentToIndex: (): void => {
              Logger.log<string>('add document to index');
            },
            searchByIndex: (): void => {
              Logger.log<string>('Searching');
            },
          },
        },
        AssetService,
      ],
    }).compile();

    assetService = module.get<AssetService>(AssetService);
    assetController = module.get<AssetController>(AssetController);
  });

  it('should create a Asset', async () => {
    jest.spyOn(assetService, 'createOne').mockResolvedValue(asset);

    expect(await assetController.createAsset(asset)).toStrictEqual(asset);
  });

  it('should get all asset Ids', async () => {
    jest.spyOn(assetService, 'findAllIds').mockResolvedValue([asset.id]);

    expect(await assetController.getAllAssetIds(undefined)).toStrictEqual([asset.id]);
  });
});
